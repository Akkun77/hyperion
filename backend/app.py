import os
import re
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Set, Optional
from collections import defaultdict, deque
from threading import Lock

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Database and Risk Engine Imports
from database.db_client import (
    init_db,
    reset_db,
    save_traffic_log,
    upsert_api_inventory,
    create_alert,
    get_inventory,
    get_alerts,
    get_traffic_logs,
    get_traffic_log_by_id,
    get_dashboard_totals,
)
from database.models import APIEndpointDB, SecurityAlertDB, TrafficLogDB
from engine.risk_scorer import evaluate_endpoint_from_state, calculate_endpoint_risk, EndpointContext
from hyperion_security_engine.analyzer import analyze_events
from hyperion_security_engine.event import APIEvent
from hyperion_security_engine.bola_detector import BOLADetector
from hyperion_security_engine.token_misuse_detector import TokenMisuseDetector

# Initialize database
init_db()

app = FastAPI(
    title="API Security & Governance Command Center",
    description="Passive traffic discovery, shadow API detection, and runtime abuse telemetry",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
OPENAPI_PATH = os.path.join(BASE_DIR, "openapi.json")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# Load OpenAPI specification
documented_routes: Set[str] = set()

def load_openapi_spec():
    global documented_routes
    documented_routes.clear()
    if os.path.exists(OPENAPI_PATH):
        try:
            with open(OPENAPI_PATH, "r", encoding="utf-8") as f:
                spec = json.load(f)
                paths = spec.get("paths", {})
                for path, methods in paths.items():
                    for method in methods.keys():
                        documented_routes.add(f"{method.upper()}:{path.rstrip('/')}")
        except Exception as e:
            print(f"[Warning] Failed to parse openapi.json: {e}")
    from product_connections import registered_routes
    documented_routes.update(registered_routes())

load_openapi_spec()
from product_traffic import router as activity_router
app.include_router(activity_router)

# Runtime abuse tracking state (in-memory sliding window & token tracking)
# IP -> list of request timestamps (epoch floats)
ip_request_timestamps: Dict[str, List[float]] = defaultdict(list)
# Token -> set of distinct caller IPs seen
token_ips: Dict[str, Set[str]] = defaultdict(set)
# Dedup alerts within short window to avoid alert spamming
alert_dedup_cache: Dict[str, float] = {}

# Keep a bounded, in-memory event window for the original Hyperion detectors.
# The SQLite audit log remains the source of truth; this buffer only supplies
# runtime analysis and is pruned on every request.
hyperion_event_buffer = deque()
hyperion_event_lock = Lock()
HYPERION_EVENT_WINDOW_SECONDS = 300.0
runtime_detectors = [
    BOLADetector(alert_cool_down_seconds=5),
    TokenMisuseDetector(ip_threshold=2, alert_cool_down_seconds=5),
]

SCRAPING_THRESHOLD = 15
SCRAPING_WINDOW_SECONDS = 10.0
TOKEN_REPLAY_IP_THRESHOLD = 2

# PII Pattern definitions
PII_KEYWORDS = ["user", "email", "ssn", "password", "secret", "credit_card", "card", "phone", "account", "balance", "token", "salary", "identity", "export"]
PII_REGEX = re.compile(r"(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)")


def normalize_route(raw_path: str) -> str:
    """
    Normalizes dynamic routes:
    /api/v1/users/123 -> /api/v1/users/{id}
    /api/v1/users/user_999/balance -> /api/v1/users/{id}/balance
    """
    clean_path = raw_path.split("?")[0].rstrip("/")
    if not clean_path:
        return "/"

    # Normalize user ID segments (numeric or user_ prefix or UUID or id-like)
    normalized = re.sub(r"/users/(user_[a-zA-Z0-9]+|\d+|[0-9a-fA-F-]{8,})(/|$)", r"/users/{id}\2", clean_path)
    normalized = re.sub(r"/accounts/([a-zA-Z0-9_-]+)(/|$)", r"/accounts/{id}\2", normalized)
    return normalized


def extract_resource_id(raw_path: str) -> str:
    """Extracts target resource identifier from dynamic route if present."""
    match = re.search(r"/users/([^/]+)", raw_path)
    if match:
        return match.group(1)
    return None


def detect_pii(path: str, body_str: str) -> bool:
    """Detects presence of PII in path or body payload."""
    path_lower = path.lower()
    for kw in PII_KEYWORDS:
        if kw in path_lower:
            return True

    if body_str:
        body_lower = body_str.lower()
        for kw in PII_KEYWORDS:
            if kw in body_lower:
                return True
        if PII_REGEX.search(body_str):
            return True
    return False


def analyze_hyperion_event(event: APIEvent, observed_at: float) -> List[dict]:
    """Analyze the current rolling window with Hyperion's detector façade."""
    with hyperion_event_lock:
        hyperion_event_buffer.append((event, observed_at))
        while (
            hyperion_event_buffer
            and observed_at - hyperion_event_buffer[0][1] > HYPERION_EVENT_WINDOW_SECONDS
        ):
            hyperion_event_buffer.popleft()
        # Stateful detectors must receive each event once. Replaying the whole
        # window would rediscover old BOLA events against unrelated requests.
        return [alert.to_dict() for detector in runtime_detectors
                for alert in detector.detect([event])]


# =====================================================================
# Traffic Interceptor & Discovery Middleware
# =====================================================================
@app.middleware("http")
async def traffic_interception_middleware(request: Request, call_next):
    raw_path = request.url.path
    method = request.method.upper()

    # Skip static frontend dashboard routes and internal governance APIs
    if (
        raw_path.startswith("/api/governance")
        or raw_path == "/api/health"
        or raw_path == "/api/traffic"
        or raw_path.startswith("/api/traffic/")
        or raw_path == "/api/alerts"
        or raw_path == "/api/risk-scores"
        or raw_path == "/api/risk-hierarchy"
        or raw_path == "/api/execution-flow"
        or raw_path.startswith("/static")
        or raw_path in ("/", "/index.html", "/favicon.ico")
    ):
        return await call_next(request)

    caller_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    if "," in caller_ip:
        caller_ip = caller_ip.split(",")[0].strip()

    # Authentication inspection
    auth_header = request.headers.get("authorization", "")
    auth_type = "None"
    token = None
    if auth_header.startswith("Bearer "):
        auth_type = "Bearer Token"
        token = auth_header[7:].strip()
    elif auth_header.startswith("Basic "):
        auth_type = "Basic"
        token = auth_header[6:].strip()
    elif "x-api-key" in request.headers:
        auth_type = "API Key"
        token = request.headers.get("x-api-key")

    # Session user extraction
    session_user_id = request.headers.get("x-user-id")
    if not session_user_id and token and token.startswith("user_"):
        session_user_id = token.split("_")[0] + "_" + token.split("_")[1]

    # Read body for inspection
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="ignore") if body_bytes else ""

    # Starlette preserves the cached body for downstream handlers.
    response = await call_next(request)

    # 1. Normalize Dynamic Route
    normalized_path = normalize_route(raw_path)
    target_resource_id = extract_resource_id(raw_path)

    # 2. Shadow API Detection
    route_key = f"{method}:{normalized_path.rstrip('/')}"
    is_shadow = route_key not in documented_routes

    # 3. PII Detection
    contains_pii = detect_pii(raw_path, body_str)

    current_time = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 4. Save Traffic Log
    traffic_log = save_traffic_log({
        "timestamp": now_iso,
        "method": method,
        "endpoint": normalized_path,
        "caller_ip": caller_ip,
        "token_user_id": session_user_id,
        "target_resource_id": target_resource_id,
        "payload_size_bytes": len(body_bytes),
        "token": (token[:12] + "...") if token and len(token) > 12 else token,
        "auth_type": auth_type,
        "status_code": response.status_code
    })

    # =================================================================
    # Runtime abuse analysis
    # =================================================================
    # Hyperion covers authorization bypass and token misuse.  The local
    # scraping rule intentionally remains at the hackathon's 15/10s demo
    # threshold, which is stricter than Hyperion's production-oriented rate.
    permission_denied = (
        session_user_id
        and target_resource_id
        and session_user_id != target_resource_id
        and target_resource_id not in ("me", "{id}")
    )
    hyperion_event = APIEvent(
        event_id=f"traffic-{traffic_log.id}",
        method=method,
        path=normalized_path,
        timestamp=now_iso,
        source_ip=caller_ip,
        user_agent=request.headers.get("user-agent"),
        api_key=token,
        user_id=session_user_id,
        status_code=response.status_code,
        body=body_str,
        headers=json.dumps({"user-agent": request.headers.get("user-agent", "")}),
        query_params=json.dumps(dict(request.query_params)),
        resource_owner=target_resource_id,
        permission_decision="deny" if permission_denied else "allow",
    )
    alert_type_map = {
        "bola": "BOLA",
        "token_misuse": "TOKEN_REPLAY",
        "scraping": "SCRAPING",
    }
    for engine_alert in analyze_hyperion_event(hyperion_event, current_time):
        alert_type = alert_type_map.get(engine_alert["alert_type"], engine_alert["alert_type"].upper())
        dedup_key = f"HYPERION:{alert_type}:{normalized_path}:{caller_ip}"
        if current_time - alert_dedup_cache.get(dedup_key, 0) > 5.0:
            alert_dedup_cache[dedup_key] = current_time
            create_alert(
                timestamp=engine_alert["timestamp"],
                endpoint=normalized_path,
                alert_type=alert_type,
                severity=engine_alert["severity"].upper(),
                caller_ip=caller_ip,
                details=(
                    f"Hyperion {engine_alert['detection_method']}: "
                    f"{engine_alert['description']}"
                ),
                related_event_id=traffic_log.id,
            )

    # Scraping anomaly (> 15 requests in 10s rolling window)
    timestamps = ip_request_timestamps[caller_ip]
    timestamps.append(current_time)
    # Evict timestamps older than 10s window
    ip_request_timestamps[caller_ip] = [t for t in timestamps if current_time - t <= SCRAPING_WINDOW_SECONDS]
    count_in_window = len(ip_request_timestamps[caller_ip])

    if count_in_window > SCRAPING_THRESHOLD:
        dedup_key = f"SCRAPING:{caller_ip}"
        if current_time - alert_dedup_cache.get(dedup_key, 0) > 5.0:
            alert_dedup_cache[dedup_key] = current_time
            create_alert(
                timestamp=now_iso,
                endpoint=normalized_path,
                alert_type="SCRAPING",
                severity="HIGH",
                caller_ip=caller_ip,
                details=f"Scraping Anomaly: IP '{caller_ip}' breached rate limit with {count_in_window} requests in 10s window (threshold: {SCRAPING_THRESHOLD})",
                related_event_id=traffic_log.id,
            )

    # 5. Dynamic Risk Scoring Calculation
    raw_alerts = get_alerts(limit=50)
    alerts_dict_list = [
        {"endpoint": a.endpoint, "alert_type": a.alert_type, "severity": a.severity}
        for a in raw_alerts
    ]
    
    # Check if endpoint was previously observed to have auth or PII
    existing_items = get_inventory()
    effective_auth = auth_type
    effective_pii = contains_pii
    for it in existing_items:
        if it.method == method and it.endpoint == normalized_path:
            if effective_auth == "None" and it.total_calls and it.auth_type and it.auth_type not in ("None", "Not observed"):
                effective_auth = it.auth_type
            if it.contains_pii:
                effective_pii = True
            break

    score, severity, reasons = evaluate_endpoint_from_state(
        method=method,
        endpoint=normalized_path,
        auth_type=effective_auth,
        is_shadow=is_shadow,
        contains_pii=effective_pii,
        alerts=alerts_dict_list
    )

    # Upsert Discovered Endpoint into Inventory
    upsert_api_inventory(
        method=method,
        endpoint=normalized_path,
        is_shadow=is_shadow,
        risk_score=score,
        reasons=reasons,
        auth_type=effective_auth,
        contains_pii=effective_pii,
        severity=severity,
        increment_call=True
    )

    return response


# =====================================================================
# Governance & Dashboard Telemetry Endpoints
# =====================================================================

@app.get("/api/governance/kpis")
def get_kpis():
    inventory = get_inventory(limit=None)

    total_apis = len(inventory)
    shadow_apis = sum(1 for e in inventory if e.is_shadow)
    managed_apis = total_apis - shadow_apis
    pii_endpoints = sum(1 for e in inventory if e.contains_pii)
    observed_inventory = [e for e in inventory if e.total_calls]
    avg_risk = round(sum(e.risk_score for e in observed_inventory) / len(observed_inventory), 1) if observed_inventory else 0

    return {
        "total_apis": total_apis,
        "shadow_apis": shadow_apis,
        "managed_apis": managed_apis,
        "pii_endpoints": pii_endpoints,
        "avg_risk_score": avg_risk,
        **get_dashboard_totals(),
    }


@app.get("/api/governance/inventory")
def get_api_inventory():
    items = get_inventory(limit=None)
    result = []
    for item in items:
        try:
            reasons = json.loads(item.risk_reasons) if item.risk_reasons else []
        except Exception:
            reasons = [item.risk_reasons] if item.risk_reasons else []

        result.append({
            "id": item.id,
            "method": item.method,
            "endpoint": item.endpoint,
            "is_shadow": item.is_shadow,
            "risk_score": item.risk_score,
            "severity": item.severity,
            "risk_reasons": reasons,
            "alert_count": item.alert_count,
            "auth_type": item.auth_type,
            "contains_pii": item.contains_pii,
            "total_calls": item.total_calls,
            "last_seen": item.last_seen
        })
    return result


@app.get("/api/governance/alerts")
def get_security_alerts():
    alerts = get_alerts(limit=100)
    return [
        {
            "id": a.id,
            "timestamp": a.timestamp,
            "endpoint": a.endpoint,
            "abuse_type": a.alert_type,
            "severity": a.severity,
            "caller_ip": a.caller_ip or "Unknown IP",
            "details": a.details
        }
        for a in alerts
    ]


@app.get("/api/governance/traffic")
def get_traffic_stream():
    logs = get_traffic_logs(limit=50)
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "method": l.method,
            "endpoint": l.endpoint,
            "caller_ip": l.caller_ip,
            "user_id": l.token_user_id,
            "target_resource_id": l.target_resource_id,
            "token": l.token,
            "auth_type": l.auth_type,
            "payload_size_bytes": l.payload_size_bytes,
            "status_code": l.status_code
        }
        for l in logs
    ]


@app.get("/api/governance/topology")
def get_topology():
    """Generates 3D node and link topology data for Three.js spatial graph."""
    inventory = get_inventory()
    alerts = get_alerts(limit=50)

    nodes = [
        {
            "id": "gateway_root",
            "label": "API Gateway Core",
            "type": "gateway",
            "risk": 0,
            "is_shadow": False,
            "calls": 100
        }
    ]
    links = []

    for item in inventory:
        node_id = f"{item.method}:{item.endpoint}"
        nodes.append({
            "id": node_id,
            "label": f"{item.method} {item.endpoint}",
            "type": "shadow" if item.is_shadow else "managed",
            "risk": item.risk_score,
            "severity": item.severity,
            "is_shadow": item.is_shadow,
            "contains_pii": item.contains_pii,
            "alerts": item.alert_count,
            "calls": item.total_calls
        })
        links.append({
            "source": "gateway_root",
            "target": node_id,
            "active": item.alert_count > 0
        })

    return {"nodes": nodes, "links": links, "alert_count": len(alerts)}


@app.get("/api/governance/download")
@app.get("/download")
def download_project_zip():
    """Provides direct browser download of the complete project zip archive."""
    zip_path = os.path.join(os.path.dirname(BASE_DIR), "api-security-command-center.zip")
    if not os.path.exists(zip_path):
        # Fallback to scratch root
        zip_path = r"C:\Users\arvin\.gemini\antigravity\scratch\api-security-command-center.zip"
    if os.path.exists(zip_path):
        return FileResponse(
            path=zip_path,
            filename="api-security-command-center.zip",
            media_type="application/zip"
        )
    raise HTTPException(status_code=404, detail="Zip archive not found")


@app.post("/api/governance/reset")
def reset_system_state():
    """Resets database and in-memory caches to a pristine state."""
    reset_db()
    ip_request_timestamps.clear()
    token_ips.clear()
    alert_dedup_cache.clear()
    with hyperion_event_lock:
        hyperion_event_buffer.clear()
    return {"status": "success", "message": "All state reset successfully"}


@app.post("/api/governance/simulate")
def trigger_simulation():
    """Triggers the full test simulation script synchronously or returns execution results."""
    import subprocess
    import sys
    sim_script = os.path.join(os.path.dirname(BASE_DIR), "simulate.py")
    if os.path.exists(sim_script):
        res = subprocess.run([sys.executable, sim_script], capture_output=True, text=True, encoding="utf-8", timeout=30)
        return {"status": "completed" if res.returncode == 0 else "error", "output": res.stdout, "errors": res.stderr}
    return {"status": "error", "message": "simulate.py not found"}


# =====================================================================
# Mock Vulnerable Target API (Documented & Shadow)
# =====================================================================

# Documented Endpoint 1: User Profile
@app.get("/api/v1/users/{id}")
def get_user_profile(id: str, request: Request):
    if request.headers.get("x-enforce-auth") == "true":
        user_id = request.headers.get("x-user-id")
        if user_id and user_id != id:
            raise HTTPException(status_code=403, detail="Forbidden: Access control enforced")
    return {
        "status": "success",
        "user_id": id,
        "name": f"Enterprise User {id}",
        "email": f"client_{id}@enterprise.com",
        "role": "customer",
        "tier": "platinum",
        "kyc_verified": True
    }


# Documented Endpoint 2: Account Balance
@app.get("/api/v1/users/{id}/balance")
def get_user_balance(id: str, request: Request):
    return {
        "status": "success",
        "account_id": f"ACC-{id}-098",
        "owner_id": id,
        "balance": 14250.75,
        "currency": "USD",
        "available_credit": 50000.00
    }


# Documented Endpoint 3: Payments
@app.post("/api/v1/payments")
async def create_payment(request: Request):
    body = await request.json()
    return {
        "status": "executed",
        "transaction_id": "TXN-9988231",
        "amount": body.get("amount", 250.0),
        "currency": body.get("currency", "USD"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Shadow / Hidden Endpoint 1: System Debug Dump (undocumented)
@app.get("/api/v2/debug")
def system_debug_dump():
    return {
        "status": "DEBUG_ACTIVE",
        "server_kernel": "Linux 6.8.0-generic",
        "internal_ip": "10.142.0.8",
        "env_dump": {
            "SECRET_KEY": "jwt_super_secret_dev_key_x99",
            "DB_CONN": "sqlite:///database/api_security.db",
            "DEBUG_MODE": True
        },
        "thread_workers": 8
    }


# Shadow / Hidden Endpoint 2: Legacy Admin Export (undocumented)
@app.get("/api/v1/admin/export")
def legacy_admin_export():
    return {
        "status": "LEGACY_EXPORT",
        "format": "csv",
        "records_exported": 5000,
        "notice": "Unmaintained admin route from 2023 deprecation cycle",
        "data_dump_preview": [
            {"user_id": "usr_001", "email": "sarah.connor@cyberdyne.net", "ssn": "987-65-4321"},
            {"user_id": "usr_002", "email": "john.wick@continental.org", "ssn": "123-45-6789"}
        ]
    }


# =====================================================================
# Additional API routes for frontend
@app.get("/api/health")
async def api_health():
    with hyperion_event_lock:
        buffered_event_count = len(hyperion_event_buffer)
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "hyperion_security_engine": "connected",
        "events_buffered": buffered_event_count,
    }

@app.get("/api/traffic")
async def api_traffic(skip: int = 0, limit: int = 100):
    logs = get_traffic_logs(skip=skip, limit=limit)
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "method": log.method,
            "endpoint": log.endpoint,
            "caller_ip": log.caller_ip,
            "user_id": log.token_user_id,
            "target_resource_id": log.target_resource_id,
            "token": log.token,
            "auth_type": log.auth_type,
            "payload_size_bytes": log.payload_size_bytes,
            "status_code": log.status_code,
        }
        for log in logs
    ]

@app.get("/api/traffic/{log_id}")
async def api_traffic_by_id(log_id: int):
    log = get_traffic_log_by_id(log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Traffic log not found")
    return {
        "id": log.id,
        "timestamp": log.timestamp,
        "method": log.method,
        "endpoint": log.endpoint,
        "caller_ip": log.caller_ip,
        "user_id": log.token_user_id,
        "target_resource_id": log.target_resource_id,
        "token": log.token,
        "auth_type": log.auth_type,
        "payload_size_bytes": log.payload_size_bytes,
        "status_code": log.status_code,
    }

@app.get("/api/alerts")
async def api_alerts(skip: int = 0, limit: int = 100):
    alerts = get_alerts(skip=skip, limit=limit)
    return [
        {
            "alert_id": str(alert.id),
            "alert_type": alert.alert_type.lower(),
            "severity": alert.severity.lower(),
            "description": alert.details,
            "detection_method": "runtime_security_analysis",
            "timestamp": alert.timestamp,
            "related_event_ids": (
                [alert.related_event_id] if alert.related_event_id is not None else []
            ),
            "recommended_action": "Review the related traffic event and access controls.",
        }
        for alert in alerts
    ]

@app.get("/api/risk-scores")
async def api_risk_scores(skip: int = 0, limit: int = 100):
    inventory = get_inventory(skip=skip, limit=limit)
    risk_scores = []
    for item in inventory:
        try:
            factors = json.loads(item.risk_reasons) if item.risk_reasons else []
        except (TypeError, json.JSONDecodeError):
            factors = [item.risk_reasons] if item.risk_reasons else []
        risk_scores.append({
            "score_id": str(item.id),
            "target_type": "endpoint",
            "target_id": f"{item.method} {item.endpoint}",
            "score": item.risk_score,
            "risk_level": item.severity,
            "factors": factors,
            "alert_id": None,
            "timestamp": item.last_seen
        })
    return risk_scores


def infer_service_domain(endpoint: str) -> dict:
    path = endpoint.strip("/")
    parts = path.split("/")
    domain_key = "core-services"
    domain_name = "Core Services"
    description = "Core application service endpoints"

    if len(parts) >= 3 and parts[0] == "api":
        seg = parts[2].lower()
        if seg in ("users", "user"):
            domain_key = "identity-users"
            domain_name = "Identity & User Service"
            description = "User accounts, authentication profiles and KYC state"
        elif seg in ("payments", "payment", "accounts", "billing"):
            domain_key = "financial-payments"
            domain_name = "Payments & Settlement Gateway"
            description = "Wire transactions, payment ledgers and account balances"
        elif seg in ("admin", "management", "export"):
            domain_key = "governance-admin"
            domain_name = "Administrative & Governance Service"
            description = "Privileged internal administrative and export operations"
        elif seg in ("debug", "system", "health", "metrics"):
            domain_key = "core-infra"
            domain_name = "Infrastructure & System Runtime"
            description = "Server kernel, environment configurations and runtime diagnostics"
        else:
            domain_key = f"{seg}-service"
            domain_name = f"{seg.capitalize()} Service"
            description = f"Endpoints managing {seg} domain resources"
    elif "users" in path:
        domain_key = "identity-users"
        domain_name = "Identity & User Service"
        description = "User accounts, authentication profiles and KYC state"
    elif "payments" in path or "balance" in path:
        domain_key = "financial-payments"
        domain_name = "Payments & Settlement Gateway"
        description = "Wire transactions, payment ledgers and account balances"
    elif "admin" in path:
        domain_key = "governance-admin"
        domain_name = "Administrative & Governance Service"
        description = "Privileged internal administrative and export operations"
    elif "debug" in path:
        domain_key = "core-infra"
        domain_name = "Infrastructure & System Runtime"
        description = "Server kernel, environment configurations and runtime diagnostics"

    return {"id": domain_key, "name": domain_name, "description": description}


@app.get("/api/risk-hierarchy")
async def api_risk_hierarchy():
    inventory = get_inventory(limit=None)
    alerts = get_alerts(limit=None)
    from database.db_client import SessionLocal
    with SessionLocal() as evidence_db:
        evidence_ids = {a.related_event_id for a in alerts if a.related_event_id}
        traffic_logs = evidence_db.query(TrafficLogDB).filter(TrafficLogDB.id.in_(evidence_ids)).all()
    traffic_by_id = {t.id: t for t in traffic_logs}

    alerts_by_endpoint = defaultdict(list)
    for a in alerts:
        candidates = [item for item in inventory if item.endpoint == a.endpoint]
        evidence = traffic_by_id.get(a.related_event_id)
        match = next((item for item in candidates if evidence and item.method == evidence.method), candidates[0] if candidates else None)
        if match:
            alerts_by_endpoint[match.id].append(a)

    services_map = {}
    for item in inventory:
        domain_info = infer_service_domain(item.endpoint)
        sid = domain_info["id"]
        if sid not in services_map:
            services_map[sid] = {
                "id": sid,
                "name": domain_info["name"],
                "description": domain_info["description"],
                "endpoints": [],
            }
        
        try:
            reasons = json.loads(item.risk_reasons) if item.risk_reasons else []
        except (TypeError, json.JSONDecodeError):
            reasons = [item.risk_reasons] if item.risk_reasons else []

        item_alerts = alerts_by_endpoint.get(item.id, [])
        formatted_alerts = []
        evidence_events = []
        for al in item_alerts:
            formatted_alerts.append({
                "alert_id": str(al.id),
                "alert_type": al.alert_type.lower(),
                "severity": al.severity.upper(),
                "description": al.details,
                "timestamp": al.timestamp,
                "related_event_id": al.related_event_id,
            })
            if al.related_event_id and al.related_event_id in traffic_by_id:
                t = traffic_by_id[al.related_event_id]
                evidence_events.append({
                    "id": t.id,
                    "method": t.method,
                    "endpoint": t.endpoint,
                    "caller_ip": t.caller_ip,
                    "user_id": t.token_user_id,
                    "target_resource_id": t.target_resource_id,
                    "status_code": t.status_code,
                    "timestamp": t.timestamp,
                })

        services_map[sid]["endpoints"].append({
            "id": item.id,
            "method": item.method,
            "endpoint": item.endpoint,
            "risk_score": item.risk_score,
            "severity": item.severity,
            "is_shadow": item.is_shadow,
            "auth_type": item.auth_type,
            "contains_pii": item.contains_pii,
            "total_calls": item.total_calls,
            "last_seen": item.last_seen,
            "risk_reasons": reasons,
            "alerts": formatted_alerts,
            "evidence_events": evidence_events,
        })

    services_list = []
    total_endpoints = len(inventory)
    total_shadow = sum(1 for it in inventory if it.is_shadow)
    total_alerts_count = len(alerts)

    for sid, sdata in services_map.items():
        endpoints = sdata["endpoints"]
        scores = [ep["risk_score"] for ep in endpoints if ep['total_calls']]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0
        max_score = max(scores) if scores else 0
        service_alerts = len({alert['alert_id'] for ep in endpoints for alert in ep['alerts']})
        shadow_count = sum(1 for ep in endpoints if ep["is_shadow"])
        
        weighted_score = int(round(0.6 * max_score + 0.4 * avg_score)) if scores else 0
        weighted_score = max(0, min(100, weighted_score))

        if weighted_score <= 30:
            sev = "LOW"
        elif weighted_score <= 60:
            sev = "MEDIUM"
        elif weighted_score <= 85:
            sev = "HIGH"
        else:
            sev = "CRITICAL"

        drivers = []
        if shadow_count > 0:
            drivers.append(f"{shadow_count} shadow / uncataloged endpoint(s) discovered")
        if service_alerts > 0:
            drivers.append(f"{service_alerts} runtime security alert(s) logged")
        if any(ep["contains_pii"] for ep in endpoints):
            drivers.append("Processes customer personal identifiable data (PII)")
        if any(ep["auth_type"] == "None" for ep in endpoints):
            drivers.append("Contains unauthenticated public route(s)")
        if not drivers:
            drivers.append("Catalog routes; inspect endpoint factors for observed exposure")

        services_list.append({
            "id": sid,
            "name": sdata["name"],
            "description": sdata["description"],
            "risk_score": weighted_score,
            "severity": sev,
            "avg_risk_score": avg_score,
            "max_risk_score": max_score,
            "endpoint_count": len(endpoints),
            "shadow_count": shadow_count,
            "alert_count": service_alerts,
            "drivers": drivers,
            "endpoints": sorted(endpoints, key=lambda x: x["risk_score"], reverse=True),
        })

    services_list.sort(key=lambda s: s["risk_score"], reverse=True)

    platform_scores = [s["risk_score"] for s in services_list if any(ep['total_calls'] for ep in s['endpoints'])]
    platform_avg = round(sum(platform_scores) / len(platform_scores), 1) if platform_scores else 0
    platform_max = max(platform_scores) if platform_scores else 0
    platform_risk = int(round(0.5 * platform_max + 0.5 * platform_avg)) if platform_scores else 0
    platform_risk = max(0, min(100, platform_risk))

    if platform_risk <= 30:
        p_sev = "LOW"
    elif platform_risk <= 60:
        p_sev = "MEDIUM"
    elif platform_risk <= 85:
        p_sev = "HIGH"
    else:
        p_sev = "CRITICAL"

    platform_factors = []
    if total_shadow > 0:
        platform_factors.append(f"{total_shadow} shadow APIs uncataloged in OpenAPI spec")
    if total_alerts_count > 0:
        platform_factors.append(f"{total_alerts_count} active security anomalies logged across environment")
    if services_list:
        platform_factors.append(f"Highest exposure service: '{services_list[0]['name']}' ({services_list[0]['risk_score']}/100)")
    if not platform_factors:
        platform_factors.append("Clean operational posture across all registered service domains")

    return {
        "platform": {
            "name": "Hyperion API Security Platform",
            "organization": "Local monitored environment",
            "risk_score": platform_risk,
            "severity": p_sev,
            "total_services": len(services_list),
            "total_endpoints": total_endpoints,
            "total_shadow_endpoints": total_shadow,
            "active_alerts_count": total_alerts_count,
            "factors": platform_factors,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        },
        "services": services_list,
    }


@app.get("/api/execution-flow")
async def api_execution_flow(alert_id: Optional[str] = None, event_id: Optional[int] = None):
    alerts = get_alerts(limit=50)
    traffic_logs = get_traffic_logs(limit=50)
    inventory = get_inventory(limit=100)
    inv_by_endpoint = {f"{item.method}:{item.endpoint}": item for item in inventory}

    target_alert = None
    target_traffic = None

    if alert_id:
        from database.db_client import SessionLocal
        with SessionLocal() as evidence_db:
            target_alert = evidence_db.query(SecurityAlertDB).filter(SecurityAlertDB.id == alert_id).first()
        if target_alert is None:
            raise HTTPException(404, 'Finding not found')
        if target_alert and target_alert.related_event_id:
            target_traffic = get_traffic_log_by_id(target_alert.related_event_id)
    elif event_id:
        target_traffic = get_traffic_log_by_id(event_id)
        if target_traffic is None:
            raise HTTPException(404, 'Traffic event not found')
        if target_traffic:
            from database.db_client import SessionLocal
            with SessionLocal() as evidence_db:
                target_alert = evidence_db.query(SecurityAlertDB).filter_by(related_event_id=target_traffic.id).order_by(SecurityAlertDB.id.desc()).first()
    
    if not target_alert and not target_traffic:
        for a in alerts:
            if a.related_event_id:
                target_alert = a
                target_traffic = get_traffic_log_by_id(a.related_event_id)
                if target_traffic:
                    break
        if not target_traffic and traffic_logs:
            target_traffic = traffic_logs[0]
            target_alert = next((a for a in alerts if a.related_event_id == target_traffic.id), None)

    available_events = []
    seen_ids = set()
    for a in alerts:
        label = f"Alert #{a.id} — {a.alert_type.upper()} ({a.endpoint})"
        available_events.append({
            "type": "alert",
            "id": str(a.id),
            "event_id": a.related_event_id,
            "label": label,
            "alert_type": a.alert_type.lower(),
            "severity": a.severity.upper(),
            "timestamp": a.timestamp,
        })
        if a.related_event_id:
            seen_ids.add(a.related_event_id)

    for t in traffic_logs[:10]:
        if t.id not in seen_ids:
            available_events.append({
                "type": "traffic",
                "id": str(t.id),
                "event_id": t.id,
                "label": f"Traffic #{t.id} — {t.method} {t.endpoint} ({t.status_code})",
                "alert_type": "traffic",
                "severity": "INFO" if t.status_code < 400 else "WARN",
                "timestamp": t.timestamp,
            })

    if target_alert and not any(item['type']=='alert' and item['id']==str(target_alert.id) for item in available_events):
        available_events.insert(0,dict(type='alert',id=str(target_alert.id),event_id=target_alert.related_event_id,label=f'Alert #{target_alert.id} — {target_alert.alert_type} ({target_alert.endpoint})',alert_type=target_alert.alert_type.lower(),severity=target_alert.severity,timestamp=target_alert.timestamp))
    if target_traffic and not target_alert and not any(item['type']=='traffic' and item['id']==str(target_traffic.id) for item in available_events):
        available_events.insert(0,dict(type='traffic',id=str(target_traffic.id),event_id=target_traffic.id,label=f'Traffic #{target_traffic.id} — {target_traffic.method} {target_traffic.endpoint}',alert_type='traffic',severity='INFO',timestamp=target_traffic.timestamp))

    if not target_traffic and not target_alert:
        return {
            "has_data": False,
            "message": "No traffic or alert telemetry observed yet. Run demo simulation to generate execution trace.",
            "available_events": [],
            "stages": []
        }

    method = target_traffic.method if target_traffic else "GET"
    endpoint = target_traffic.endpoint if target_traffic else (target_alert.endpoint if target_alert else "/api/v1/unknown")
    caller_ip = target_traffic.caller_ip if target_traffic else (target_alert.caller_ip if target_alert else "Unknown")
    user_id = target_traffic.token_user_id if target_traffic else "None"
    target_res = target_traffic.target_resource_id if target_traffic else "None"
    status_code = target_traffic.status_code if target_traffic else (200 if target_alert else 0)
    auth_type = target_traffic.auth_type if target_traffic else "Bearer Token"
    timestamp = target_traffic.timestamp if target_traffic else (target_alert.timestamp if target_alert else datetime.now(timezone.utc).isoformat())

    inv_item = inv_by_endpoint.get(f"{method}:{endpoint}")
    is_shadow = inv_item.is_shadow if inv_item else (endpoint in ("/api/v2/debug", "/api/v1/admin/export", "/api/v1/admin/users"))
    domain_info = infer_service_domain(endpoint)

    detector_name = "Hyperion Passive Inspector"
    rule_desc = "Traffic inspected against OpenAPI catalog and baseline authorization policy"
    alert_name = target_alert.alert_type.upper() if target_alert else "NORMAL_TRAFFIC"
    alert_sev = target_alert.severity.upper() if target_alert else "BENIGN"

    if target_alert:
        at = target_alert.alert_type.lower()
        if "bola" in at:
            detector_name = "BOLA Ownership Detector"
            rule_desc = f"Cross-user access: Token user '{user_id}' requested target resource '{target_res}' and succeeded (HTTP {status_code})"
        elif "token" in at or "replay" in at:
            detector_name = "Token Misuse & IP Diversity Detector"
            rule_desc = f"Single session credential observed concurrently across multiple remote caller IPs"
        elif "scraping" in at:
            detector_name = "Burst Scraping & Rate Heuristic"
            rule_desc = f"Request volume from caller IP '{caller_ip}' exceeded rolling window rate threshold"
        elif "shadow" in at or is_shadow:
            detector_name = "Shadow API Discovery Analyzer"
            rule_desc = f"Endpoint '{endpoint}' actively received traffic while absent from managed OpenAPI contract"

    stages = [
        {
            "step": 1,
            "id": "incoming-request",
            "name": "Incoming Edge Request",
            "status": "observed",
            "summary": f"{method} {endpoint} from {caller_ip}",
            "meta": {
                "Method": method,
                "Caller IP": caller_ip,
                "Identity": user_id or "Not supplied",
                "Target Resource": target_res or "Global / Static",
                "Auth Signal": auth_type,
                "Timestamp": timestamp,
            }
        },
        {
            "step": 2,
            "id": "endpoint-catalog",
            "name": "API Endpoint Resolution",
            "status": "warning" if is_shadow else "verified",
            "summary": f"{domain_info['name']} · {'SHADOW / UNMANAGED' if is_shadow else 'Managed Catalog'}",
            "meta": {
                "Normalized Route": endpoint,
                "Classification": "Shadow API" if is_shadow else "Managed Route",
                "Service Domain": domain_info["name"],
                "Documented in Spec": not is_shadow,
                "Contains PII": inv_item.contains_pii if inv_item else False,
            }
        },
        {
            "step": 3,
            "id": "traffic-audit",
            "name": "Traffic Log Persistence",
            "status": "persisted",
            "summary": f"Audit record #{target_traffic.id if target_traffic else 'N/A'} (HTTP {status_code})",
            "meta": {
                "Log ID": f"#{target_traffic.id}" if target_traffic else "Buffered",
                "HTTP Status": status_code,
                "Payload Bytes": target_traffic.payload_size_bytes if target_traffic else 0,
                "Storage Engine": "SQLite (traffic_logs)",
            }
        },
        {
            "step": 4,
            "id": "detector-eval",
            "name": "Security Engine Evaluation",
            "status": "triggered" if target_alert else "cleared",
            "summary": f"{detector_name} · {'TRIGGERED' if target_alert else 'Normal Activity'}",
            "meta": {
                "Detector": detector_name,
                "Decision Rule": rule_desc,
                "Engine Façade": "Hyperion Security Engine (v1.0)",
                "Action Taken": "Alert Generated" if target_alert else "Logged & Allowed",
            }
        },
        {
            "step": 5,
            "id": "alert-dispatch",
            "name": "Alert Creation & Classification",
            "status": alert_sev.lower() if target_alert else "benign",
            "summary": f"{alert_name} [{alert_sev}] #{target_alert.id if target_alert else 'NONE'}",
            "meta": {
                "Alert ID": f"#{target_alert.id}" if target_alert else "None",
                "Threat Type": alert_name,
                "Severity": alert_sev,
                "Details": target_alert.details if target_alert else "No anomaly detected",
            }
        },
        {
            "step": 6,
            "id": "risk-recalculation",
            "name": "Risk Intelligence Update",
            "status": "updated",
            "summary": f"Score {inv_item.risk_score}/100 ({inv_item.severity})" if inv_item else 'Risk not evaluated: no inventory record',
            "meta": {
                "Endpoint Score": f"{inv_item.risk_score} / 100" if inv_item else 'Not evaluated',
                "Exposure Severity": inv_item.severity if inv_item else "Not evaluated",
                "Primary Driver": (inv_item.risk_reasons if inv_item else "No persisted risk factors"),
                "Parent Domain": domain_info["name"],
            }
        },
        {
            "step": 7,
            "id": "evidence-link",
            "name": "Forensic Evidence Trace",
            "status": "linked" if target_traffic else "unlinked",
            "summary": f"Finding #{target_alert.id} ↔ Traffic Event #{target_traffic.id}" if target_alert and target_traffic else f"Persisted request #{target_traffic.id}; no linked finding" if target_traffic else 'No linked traffic record',
            "meta": {
                "Linked Traffic ID": target_traffic.id if target_traffic else None,
                "Linked Alert ID": str(target_alert.id) if target_alert else None,
                "Traceability": "Persisted request evidence" if target_traffic else 'No request evidence available',
                "Investigation URL": f"/command-center/investigation?alert={target_alert.id}" if target_alert else (f"/command-center/investigation?event={target_traffic.id}" if target_traffic else "/command-center/investigation"),
            }
        }
    ]

    return {
        "has_data": True,
        "selected_alert_id": str(target_alert.id) if target_alert else None,
        "selected_event_id": target_traffic.id if target_traffic else None,
        "available_events": available_events,
        "stages": stages,
    }


from product_connections import install_connections
from product_demo import install_demo
install_connections(app, documented_routes, evaluate_endpoint_from_state)
install_demo(app, api_execution_flow)

# Serve Frontend Static Dashboard
# =====================================================================

@app.get("/", response_class=HTMLResponse)
def serve_index():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>API Security Command Center Frontend Index Not Found</h1>")
