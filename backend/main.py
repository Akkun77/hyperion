from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from security_engine.pii_detector import detect_pii, DetectionResult, SecurityAction
from database.seed_data import get_db
from database.models import SecurityIncident, User
from datetime import datetime

app = FastAPI(
    title="Hyperion AI Security Gateway API",
    version="1.0.0",
    description="API for AI security gateway that detects and prevents data leakage"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models (matching the API spec)
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    security_action: str
    explanation: str
    incident_id: Optional[str] = None
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

class Incident(BaseModel):
    id: str
    timestamp: str
    user_id: Optional[str]
    action_taken: str
    explanation: str
    data_types_detected: List[str]

class IncidentsResponse(BaseModel):
    incidents: List[Incident]
    total: int
    limit: int
    offset: int

# Mock LLM response (deterministic and safe)
def mock_llm_response(prompt: str) -> str:
    """
    Deterministic mock LLM response that does not leak the prompt.
    """
    return "This is a mock AI response. Your message has been processed by the security gateway."
# Dependency to get DB session
def get_db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

@app.post("/api/chat", response_model=ChatResponse)
async def process_chat(chat_request: ChatRequest, db: Session = Depends(get_db_session)):
    original_message = chat_request.message
    external_user_id = chat_request.user_id
    session_id = chat_request.session_id
    
    # Step 1: Detect PII
    detection_result: DetectionResult = detect_pii(original_message)
    
    # Step 2: Determine action and prepare LLM input
    if detection_result.action == SecurityAction.BLOCK:
        # Block the request: do not call LLM
        llm_response = "Your request has been blocked due to security policy."
        # We will still create an incident for the block action
        action_taken = "block"
        explanation = detection_result.explanation
        # For blocking, we do not send any message to the LLM, so the response is the block message.
        # We'll consider the LLM response as the block message.
        # We do not need to sanitize the message for the LLM because we are not calling it.
        llm_input = None  # Not used
    else:
        # For MASK, ALLOW, WARN: we will call the LLM with a sanitized message if needed
        if detection_result.action == SecurityAction.MASK:
            # Create a sanitized message by replacing the detected PII with a placeholder
            # We use the original_value from the detection result to replace exactly what was detected
            sanitized_message = original_message.replace(detection_result.original_value, "[REDACTED]")
        else:
            # For ALLOW and WARN, we use the original message (but note: for WARN we might still want to log, but not modify)
            sanitized_message = original_message
        
        # Get response from mock LLM (safe because we passed a sanitized message for MASK, and original for ALLOW/WARN)
        llm_response = mock_llm_response(sanitized_message)
        action_taken = detection_result.action.value
        explanation = detection_result.explanation
    
    # Step 3: Create incident record (for all actions, to have an audit trail)
    # We need to map the external user_id to the internal user id in the database
    internal_user_id = None
    if external_user_id:
        # Look up user by external user_id
        db_user = db.query(User).filter(User.user_id == external_user_id).first()
        if db_user:
            internal_user_id = db_user.id
        else:
            # Create a new user if not exists
            new_user = User(
                user_id=external_user_id,
                name=f"User {external_user_id}",
                email=f"{external_user_id}@example.com",  # placeholder
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            internal_user_id = new_user.id
    
    # For chat incidents, we don't have a specific document, so document_id is None
    incident = SecurityIncident(
        incident_id=f"inc_{datetime.utcnow().timestamp()}",
        user_id=internal_user_id,  # can be None if no user_id provided or user not found/created
        document_id=None,  # chat endpoint is not tied to a document
        action_taken=action_taken,
        explanation=explanation,
        data_types_detected=[detection_result.detected_type] if detection_result.detected_type else [],
        timestamp=datetime.utcnow()
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # Step 4: Prepare and return the response
    return ChatResponse(
        response=llm_response,
        security_action=action_taken,
        explanation=explanation,
        incident_id=incident.incident_id,
        timestamp=incident.timestamp.isoformat()
    )

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0"
    )

@app.get("/api/incidents", response_model=IncidentsResponse)
def get_incidents(limit: int = 50, offset: int = 0, db: Session = Depends(get_db_session)):
    # Query incidents from the database, ordered by timestamp descending
    incidents_query = db.query(SecurityIncident).order_by(SecurityIncident.timestamp.desc())
    total = incidents_query.count()
    incidents = incidents_query.offset(offset).limit(limit).all()
    
    # Convert to Pydantic models
    incident_list = []
    for inc in incidents:
        incident_list.append(Incident(
            id=inc.incident_id,
            timestamp=inc.timestamp.isoformat(),
            user_id=db.query(User.user_id).filter(User.id == inc.user_id).scalar() if inc.user_id else None,
            action_taken=inc.action_taken,
            explanation=inc.explanation,
            data_types_detected=inc.data_types_detected.split(",") if inc.data_types_detected else []
        ))
    
    return IncidentsResponse(
        incidents=incident_list,
        total=total,
        limit=limit,
        offset=offset
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
