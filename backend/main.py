"""
AI Security Gateway - Unified FastAPI Backend
Protects LLM interactions with:
1. Prompt Injection Detection (protectai/deberta-v3-base-prompt-injection via Transformers)
2. Inbound & Outbound PII Redaction (Microsoft Presidio)
3. Access-Controlled RAG (Clearance Hierarchy: public < internal < confidential)
4. Local LLM Integration (Ollama Llama 3)
5. Audit Logging & Security Dashboard (/api/v1/dashboard/logs)
"""

import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai-security-gateway")

# ---------------------------------------------------------------------------
# Configuration & Global State
# ---------------------------------------------------------------------------
OLLAMA_GENERATE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
PROMPT_INJECTION_MODEL = "protectai/deberta-v3-base-prompt-injection"

# Clearance hierarchy: higher numbers indicate higher privilege
CLEARANCE_HIERARCHY: Dict[str, int] = {
    "public": 1,
    "internal": 2,
    "confidential": 3,
}

# In-memory thread-safe audit log storage
audit_logs: List[Dict[str, Any]] = []
audit_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Lazy-Loaded Security Engines
# ---------------------------------------------------------------------------
_injection_classifier = None
_presidio_analyzer = None
_presidio_anonymizer = None
_classifier_lock = threading.Lock()
_presidio_lock = threading.Lock()


def get_injection_classifier():
    """
    Lazy-loads the Hugging Face prompt injection classification pipeline.
    """
    global _injection_classifier
    if _injection_classifier is None:
        with _classifier_lock:
            if _injection_classifier is None:
                try:
                    logger.info("Loading Hugging Face model: %s", PROMPT_INJECTION_MODEL)
                    from transformers import pipeline
                    _injection_classifier = pipeline(
                        "text-classification",
                        model=PROMPT_INJECTION_MODEL,
                        truncation=True,
                        max_length=512,
                    )
                    logger.info("Prompt injection classifier initialized successfully.")
                except Exception as exc:
                    logger.error("Failed to load prompt injection model: %s", str(exc))
                    _injection_classifier = "FAILED"
    return _injection_classifier


def get_presidio_engines():
    """
    Lazy-loads Microsoft Presidio Analyzer and Anonymizer engines.
    """
    global _presidio_analyzer, _presidio_anonymizer
    if _presidio_analyzer is None or _presidio_anonymizer is None:
        with _presidio_lock:
            if _presidio_analyzer is None or _presidio_anonymizer is None:
                try:
                    logger.info("Initializing Microsoft Presidio Analyzer and Anonymizer engines...")
                    from presidio_analyzer import AnalyzerEngine
                    from presidio_anonymizer import AnonymizerEngine

                    _presidio_analyzer = AnalyzerEngine()
                    _presidio_anonymizer = AnonymizerEngine()
                    logger.info("Presidio engines initialized successfully.")
                except Exception as exc:
                    logger.error("Failed to initialize Presidio engines: %s", str(exc))
                    raise RuntimeError(f"Presidio engine initialization error: {exc}") from exc
    return _presidio_analyzer, _presidio_anonymizer


# ---------------------------------------------------------------------------
# Mock Document Store for Access-Controlled RAG
# ---------------------------------------------------------------------------
MOCK_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "DOC-PUB-001",
        "title": "Company Overview and Mission",
        "clearance": "public",
        "content": (
            "Antigravity Corp is a pioneer in AI safety and governance solutions, "
            "enabling enterprise deployments of foundation models with zero data leakage."
        ),
    },
    {
        "id": "DOC-PUB-002",
        "title": "Customer Support Hours and Guidelines",
        "clearance": "public",
        "content": (
            "Standard customer support is available Monday through Friday, 9am - 6pm EST. "
            "For incident escalations, submit a ticket via the security portal."
        ),
    },
    {
        "id": "DOC-INT-001",
        "title": "Internal Network and Cluster Architecture",
        "clearance": "internal",
        "content": (
            "The internal LLM serving cluster operates within a dedicated VPC. "
            "All internal services communicate over gRPC with mTLS enabled. "
            "Staging endpoints are restricted to IP range 10.240.0.0/16."
        ),
    },
    {
        "id": "DOC-INT-002",
        "title": "Employee Remote Work and Device Policy",
        "clearance": "internal",
        "content": (
            "All employee laptops must run the enterprise EDR agent and have full-disk "
            "encryption (BitLocker/FileVault) enabled. Remote SSH access requires YubiKey MFA."
        ),
    },
    {
        "id": "DOC-CONF-001",
        "title": "Project Titan Budget and Financial Forecast",
        "clearance": "confidential",
        "content": (
            "Project Titan annual allocated capital is $14.5M USD. Projected Q4 runway "
            "includes confidential acquisition discussions with vendor Aegis Cyber."
        ),
    },
    {
        "id": "DOC-CONF-002",
        "title": "Production KMS Master Key Architecture",
        "clearance": "confidential",
        "content": (
            "Production root secret encryption key alias: 'kms/prod/ai-gateway-root-2026'. "
            "Key rotation occurs semi-annually under multi-party quorum authorization."
        ),
    },
]

# ---------------------------------------------------------------------------
# Audit Logging Service
# ---------------------------------------------------------------------------
def record_audit_log(
    user_id: str,
    policy: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Appends a security audit entry into the in-memory log.
    CRITICAL: Never persists raw sensitive data or injection payloads.
    """
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "policy": policy,
        "action": action,
        "details": details or {},
    }
    with audit_lock:
        audit_logs.append(entry)
    logger.warning(
        "[AUDIT EVENT] Policy='%s' Action='%s' User='%s' Details=%s",
        policy,
        action,
        user_id,
        details,
    )
    return entry


# ---------------------------------------------------------------------------
# Security Subsystem 1: Prompt Injection Detection
# ---------------------------------------------------------------------------
def detect_prompt_injection(prompt: str) -> tuple[bool, float, str]:
    """
    Scans the incoming prompt using the protectai/deberta-v3-base-prompt-injection model.
    Returns: (is_injection: bool, score: float, label: str)
    """
    classifier = get_injection_classifier()

    # Fallback heuristic if model failed to load in offline test environment
    if classifier == "FAILED":
        lower = prompt.lower()
        suspicious = [
            "ignore all previous instructions",
            "ignore previous directions",
            "system override",
            "disregard instructions",
            "you are now unfiltered",
            "dan mode",
            "bypass security policies"
        ]
        for pattern in suspicious:
            if pattern in lower:
                return True, 0.99, "INJECTION_HEURISTIC"
        return False, 0.05, "SAFE_HEURISTIC"

    try:
        results = classifier(prompt)
        if results and len(results) > 0:
            top_prediction = results[0]
            label = str(top_prediction.get("label", "")).upper()
            score = float(top_prediction.get("score", 0.0))

            # The protectai model returns label 'INJECTION' or 'SAFE' (or LABEL_1 for injection)
            is_injection = (label in ("INJECTION", "LABEL_1")) and (score >= 0.5)
            return is_injection, score, label
    except Exception as exc:
        logger.error("Error during prompt injection scanning: %s", str(exc))

    return False, 0.0, "UNKNOWN"


# ---------------------------------------------------------------------------
# Security Subsystem 2: PII Redaction (Inbound & Outbound)
# ---------------------------------------------------------------------------
def sanitize_pii(text: str) -> tuple[str, List[str], int]:
    """
    Uses Microsoft Presidio Analyzer & Anonymizer to detect and mask PII
    (Phone numbers, SSN, Credit Cards, Emails, etc.).
    Returns: (sanitized_text: str, detected_entity_types: List[str], count: int)
    """
    if not text or not text.strip():
        return text, [], 0

    analyzer, anonymizer = get_presidio_engines()

    target_entities = [
        "PHONE_NUMBER",
        "US_SSN",
        "CREDIT_CARD",
        "EMAIL_ADDRESS",
        "IBAN_CODE",
        "US_PASSPORT",
        "US_DRIVER_LICENSE",
        "CRYPTO",
    ]

    analysis_results = analyzer.analyze(
        text=text,
        language="en",
        entities=target_entities,
    )

    if not analysis_results:
        return text, [], 0

    anonymized_result = anonymizer.anonymize(
        text=text,
        analyzer_results=analysis_results,
    )

    detected_entities = sorted(list({res.entity_type for res in analysis_results}))
    return anonymized_result.text, detected_entities, len(analysis_results)


# ---------------------------------------------------------------------------
# Security Subsystem 3: Access-Controlled Mock RAG
# ---------------------------------------------------------------------------
def retrieve_rag_context(user_clearance: str, prompt: str) -> tuple[str, List[Dict[str, Any]]]:
    """
    Retrieves knowledge context matching or lower than the user's clearance level.
    Clearance hierarchy: public (1) <= internal (2) <= confidential (3)
    """
    normalized_clearance = user_clearance.strip().lower()
    user_weight = CLEARANCE_HIERARCHY.get(normalized_clearance, 0)

    if user_weight == 0:
        logger.warning("Unrecognized clearance level '%s', defaulting to no access.", user_clearance)
        return "No authorized context available.", []

    # Filter documents user has clearance to view
    accessible_docs = [
        doc for doc in MOCK_DOCUMENTS
        if CLEARANCE_HIERARCHY.get(doc["clearance"], 999) <= user_weight
    ]

    # Rank documents: prioritize docs matching keywords in prompt
    prompt_tokens = set(prompt.lower().split())
    scored_docs = []
    for doc in accessible_docs:
        doc_tokens = set((doc["title"] + " " + doc["content"]).lower().split())
        overlap = len(prompt_tokens.intersection(doc_tokens))
        scored_docs.append((overlap, doc))

    # Sort descending by relevance score, take top 3
    scored_docs.sort(key=lambda item: item[0], reverse=True)
    selected_docs = [doc for _, doc in scored_docs[:3]]

    context_segments = [
        f"[Document: {doc['title']} (Clearance: {doc['clearance'].upper()})]: {doc['content']}"
        for doc in selected_docs
    ]
    formatted_context = "\n".join(context_segments) if context_segments else "No relevant context found."

    metadata_list = [
        {"id": d["id"], "title": d["title"], "clearance": d["clearance"]}
        for d in selected_docs
    ]
    return formatted_context, metadata_list


# ---------------------------------------------------------------------------
# Security Subsystem 4: Local Ollama LLM Client
# ---------------------------------------------------------------------------
def call_local_ollama(sanitized_prompt: str, rag_context: str) -> str:
    """
    Sends sanitized prompt and authorized RAG context to local Ollama instance (Llama 3).
    Gracefully handles local offline status for seamless testing.
    """
    combined_prompt = (
        f"You are an enterprise AI assistant protected by a security gateway.\n\n"
        f"AUTHORIZED CONTEXT:\n{rag_context}\n\n"
        f"USER PROMPT:\n{sanitized_prompt}\n\n"
        f"INSTRUCTIONS:\n"
        f"Answer the user request accurately and concisely based on the authorized context.\n"
        f"Never disclose secret credentials or confidential information outside your authorization."
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": combined_prompt,
        "stream": False,
    }

    try:
        response = requests.post(OLLAMA_GENERATE_URL, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
    except requests.exceptions.ConnectionError:
        logger.warning(
            "Local Ollama instance not reachable at %s. Returning synthetic LLM response.",
            OLLAMA_GENERATE_URL,
        )
        return (
            f"[Local Ollama Offline Fallback] Received sanitized prompt: '{sanitized_prompt}'. "
            f"Retrieved {len(rag_context.splitlines())} context segment(s). "
            f"To connect live LLM, start Ollama locally via 'ollama run {OLLAMA_MODEL}'."
        )
    except Exception as exc:
        logger.error("Upstream error contacting Ollama: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream LLM error: {str(exc)}",
        ) from exc


# ---------------------------------------------------------------------------
# FastAPI Schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier of the user or client system")
    clearance_level: str = Field(..., description="Access clearance level: 'public', 'internal', or 'confidential'")
    prompt: str = Field(..., description="The natural language prompt submitted by the user")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "usr-1049",
                "clearance_level": "internal",
                "prompt": "What is the architecture of the internal cluster? My phone is 555-123-4567."
            }
        }


class ChatResponse(BaseModel):
    status: str
    user_id: str
    clearance_level: str
    response: str
    sanitized_prompt: str
    retrieved_documents: List[Dict[str, Any]]
    pii_detected_inbound: List[str]
    pii_detected_outbound: List[str]
    timestamp: str


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    user_id: str
    policy: str
    action: str
    details: Dict[str, Any]


class AuditDashboardResponse(BaseModel):
    total_logs: int
    logs: List[AuditLogEntry]


# ---------------------------------------------------------------------------
# FastAPI Application & Endpoints
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Security Gateway",
    version="1.0.0",
    description=(
        "Enterprise AI Security Gateway providing Prompt Injection defense, "
        "Inbound/Outbound PII redaction, Clearance-based RAG retrieval, and Audit Logging."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Security Gateway...")
    logger.info("Ollama Target: %s (model=%s)", OLLAMA_GENERATE_URL, OLLAMA_MODEL)
    logger.info("Supported clearance levels: %s", list(CLEARANCE_HIERARCHY.keys()))


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "AI Security Gateway",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "chat": "POST /api/v1/chat",
            "dashboard_logs": "GET /api/v1/dashboard/logs",
            "health": "GET /health",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/v1/chat", response_model=ChatResponse, tags=["Security Gateway"])
async def chat_endpoint(payload: ChatRequest):
    """
    Core Gateway pipeline:
    1. Prompt Injection Scanning: Block & audit if malicious injection is detected.
    2. Inbound PII Redaction: Mask sensitive tokens before reaching the LLM & record audit log.
    3. Access-Controlled RAG: Retrieve context filtered strictly by clearance level.
    4. LLM Generation: Query local Ollama instance with sanitized prompt & authorized context.
    5. Outbound PII Redaction: Mask any sensitive tokens leaked in the LLM response & record audit log.
    6. Return sanitized response to client.
    """
    user_id = payload.user_id.strip()
    clearance = payload.clearance_level.strip().lower()
    raw_prompt = payload.prompt

    if not raw_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty.",
        )

    # Validate clearance level
    if clearance not in CLEARANCE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid clearance_level '{payload.clearance_level}'. Must be one of: {list(CLEARANCE_HIERARCHY.keys())}",
        )

    # -----------------------------------------------------------------------
    # Step 1: Prompt Injection Detection
    # -----------------------------------------------------------------------
    is_injection, injection_score, detected_label = detect_prompt_injection(raw_prompt)
    if is_injection:
        record_audit_log(
            user_id=user_id,
            policy="PROMPT_INJECTION",
            action="BLOCKED",
            details={
                "score": round(injection_score, 4),
                "label": detected_label,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request blocked: Prompt injection detected by security gateway.",
        )

    # -----------------------------------------------------------------------
    # Step 2: Inbound PII Redaction
    # -----------------------------------------------------------------------
    sanitized_prompt, inbound_pii_entities, inbound_count = sanitize_pii(raw_prompt)
    if inbound_pii_entities:
        record_audit_log(
            user_id=user_id,
            policy="PII_LEAK_INBOUND",
            action="MASKED",
            details={
                "entities_detected": inbound_pii_entities,
                "count": inbound_count,
            },
        )

    # -----------------------------------------------------------------------
    # Step 3: Access-Controlled RAG Context Retrieval
    # -----------------------------------------------------------------------
    rag_context, retrieved_docs = retrieve_rag_context(
        user_clearance=clearance,
        prompt=sanitized_prompt,
    )

    # -----------------------------------------------------------------------
    # Step 4: Local Ollama LLM Generation
    # -----------------------------------------------------------------------
    raw_llm_response = call_local_ollama(
        sanitized_prompt=sanitized_prompt,
        rag_context=rag_context,
    )

    # -----------------------------------------------------------------------
    # Step 5: Outbound PII Redaction
    # -----------------------------------------------------------------------
    sanitized_response, outbound_pii_entities, outbound_count = sanitize_pii(raw_llm_response)
    if outbound_pii_entities:
        record_audit_log(
            user_id=user_id,
            policy="PII_LEAK_OUTBOUND",
            action="MASKED",
            details={
                "entities_detected": outbound_pii_entities,
                "count": outbound_count,
            },
        )

    # -----------------------------------------------------------------------
    # Step 6: Return Sanitized Response
    # -----------------------------------------------------------------------
    return ChatResponse(
        status="success",
        user_id=user_id,
        clearance_level=clearance,
        response=sanitized_response,
        sanitized_prompt=sanitized_prompt,
        retrieved_documents=retrieved_docs,
        pii_detected_inbound=inbound_pii_entities,
        pii_detected_outbound=outbound_pii_entities,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/api/v1/dashboard/logs", response_model=AuditDashboardResponse, tags=["Security Dashboard"])
async def get_dashboard_logs():
    """
    Returns security audit logs for the frontend monitoring dashboard.
    """
    with audit_lock:
        current_logs = list(audit_logs)

    return AuditDashboardResponse(
        total_logs=len(current_logs),
        logs=current_logs,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
