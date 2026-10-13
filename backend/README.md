# AI Security Gateway

An enterprise-grade security gateway and firewall for Large Language Model (LLM) applications.

## Key Features

1. **Prompt Injection Defense**: Evaluates incoming prompts using Hugging Face's `protectai/deberta-v3-base-prompt-injection` classification model. Malicious attempts are blocked immediately with an HTTP 403 Forbidden response.
2. **Inbound & Outbound PII Redaction**: Integrates Microsoft Presidio Analyzer and Anonymizer to mask sensitive data (e.g., Phone numbers, SSNs, Credit Cards, Emails) both before reaching the LLM and before the response returns to the client.
3. **Access-Controlled RAG**: Implements hierarchical clearance control (`public` < `internal` < `confidential`) to ensure users only retrieve information authorized for their clearance level.
4. **Local LLM Integration**: Connects seamlessly to a local Ollama instance running Llama 3 (`http://localhost:11434/api/generate`), with robust fallback handling when offline.
5. **Security Audit Logging**: Captures security events (Prompt Injections, Inbound/Outbound PII masking) in an in-memory audit log while strictly preserving privacy (never logging sensitive data).
6. **Security Dashboard Endpoint**: Exposes `/api/v1/dashboard/logs` for real-time frontend monitoring.

---

## Getting Started

### 1. Installation

Create and activate a virtual environment, then install the dependencies:

```bash
cd ai-security-gateway
python -m venv venv

# Windows:
.\venv\Scripts\activate

# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

*(Optional for Presidio spacy recognizer)*:
```bash
python -m spacy download en_core_web_sm
```

### 2. (Optional) Start Local Ollama

To test live responses with Llama 3:
```bash
ollama run llama3
```
*Note: If Ollama is not running, the gateway automatically falls back to an offline simulated response.*

### 3. Run the Gateway

Start the FastAPI application with Uvicorn:

```bash
python main.py
```
Or:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The interactive OpenAPI documentation will be available at:
`http://localhost:8000/docs`

---

## API Reference

### 1. POST `/api/v1/chat`

Processes a prompt through the security gateway.

**Request:**
```json
{
  "user_id": "user_42",
  "clearance_level": "internal",
  "prompt": "What is the network architecture? Please reach out to me at 555-019-2834."
}
```

**Response:**
```json
{
  "status": "success",
  "user_id": "user_42",
  "clearance_level": "internal",
  "response": "...",
  "sanitized_prompt": "What is the network architecture? Please reach out to me at <PHONE_NUMBER>.",
  "retrieved_documents": [
    {
      "id": "DOC-INT-001",
      "title": "Internal Network and Cluster Architecture",
      "clearance": "internal"
    }
  ],
  "pii_detected_inbound": ["PHONE_NUMBER"],
  "pii_detected_outbound": [],
  "timestamp": "2026-10-13T14:00:00Z"
}
```

### 2. GET `/api/v1/dashboard/logs`

Returns the security audit logs for monitoring and compliance.

**Response:**
```json
{
  "total_logs": 2,
  "logs": [
    {
      "id": "7f8b9e6a-1234-4a56-89bc-abcdef012345",
      "timestamp": "2026-10-13T14:00:00Z",
      "user_id": "user_42",
      "policy": "PII_LEAK_INBOUND",
      "action": "MASKED",
      "details": {
        "entities_detected": ["PHONE_NUMBER"],
        "count": 1
      }
    }
  ]
}
```
