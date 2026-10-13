"""
db_client.py
Database connection manager and query functions for the AI Security Gateway.

Manages:
- Relational SQLite database via SQLAlchemy.
- Persistent Vector database via ChromaDB.
- Core functions: log_security_incident, get_audit_logs, retrieve_allowed_context.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional, Union

import chromadb
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Support relative or absolute imports when running as package or standalone
try:
    from database.models import (
        Base,
        User,
        AuditLog,
        CLEARANCE_LEVELS,
        CLEARANCE_NAMES,
    )
except ImportError:
    from models import (
        Base,
        User,
        AuditLog,
        CLEARANCE_LEVELS,
        CLEARANCE_NAMES,
    )

# -----------------------------------------------------------------------------
# Configuration and Path Resolution
# -----------------------------------------------------------------------------
DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(DB_DIR, "gateway.db")
DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

CHROMA_DATA_PATH = os.path.join(DB_DIR, ".chroma_data")
COLLECTION_NAME = "secure_documents"

# Ensure the database directory exists
os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(CHROMA_DATA_PATH, exist_ok=True)

# -----------------------------------------------------------------------------
# SQLAlchemy Relational Engine & Session
# -----------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite with multithreaded backends
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI-compatible database session dependency generator.
    Yields a session and guarantees closure upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------------------------------------------------------
# ChromaDB Vector Client & Collection
# -----------------------------------------------------------------------------
# PersistentClient automatically stores and persists vector collections on disk
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)


def get_chroma_collection():
    """
    Retrieves or creates the secure_documents collection in ChromaDB.
    """
    return chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Clearance-tagged RAG documents for AI Security Gateway"},
    )


# Initialize reference to collection
secure_documents_collection = get_chroma_collection()


# -----------------------------------------------------------------------------
# Database Initialization Utilities
# -----------------------------------------------------------------------------
def init_db() -> None:
    """
    Creates all SQLite relational tables (User, AuditLog) if they do not exist
    and verifies the ChromaDB collection is initialized.
    """
    Base.metadata.create_all(bind=engine)
    get_chroma_collection()


# -----------------------------------------------------------------------------
# Core Required Functions
# -----------------------------------------------------------------------------
def log_security_incident(user_id: str, policy: str, action: str) -> AuditLog:
    """
    Inserts a new AuditLog entry into SQLite.

    :param user_id: Identifier of the user triggering the request.
    :param policy: Policy name or rule triggered (e.g., 'pii_leak_detected', 'unauthorized_clearance').
    :param action: Action taken by the gateway (e.g., 'blocked', 'redacted', 'allowed').
    :return: The committed AuditLog instance.
    """
    session = SessionLocal()
    try:
        incident = AuditLog(
            user_id=user_id,
            policy_triggered=policy,
            action_taken=action,
            timestamp=datetime.now(timezone.utc),
        )
        session.add(incident)
        session.commit()
        session.refresh(incident)
        session.expunge(incident)  # Detach from session so attributes can be read safely outside
        return incident
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_audit_logs() -> List[AuditLog]:
    """
    Retrieves all audit logs for the backend dashboard,
    ordered by timestamp descending (newest first).

    :return: List of AuditLog model instances.
    """
    session = SessionLocal()
    try:
        logs = session.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
        session.expunge_all()
        return logs
    finally:
        session.close()


def retrieve_allowed_context(
    query: str,
    user_clearance: Union[str, int],
    n_results: int = 5,
) -> Dict[str, Any]:
    """
    Queries ChromaDB for the most relevant documents, but strictly filters
    the vector search using ChromaDB metadata filtering ($lte or $in) to only
    return documents where the document's clearance level is less than or
    equal to the user's clearance.

    :param query: Semantic search string / user prompt.
    :param user_clearance: User's clearance level as string ('public', 'internal', 'confidential')
                           or as an integer rank (1, 2, 3).
    :param n_results: Maximum number of relevant documents to retrieve.
    :return: ChromaDB query result dictionary containing 'documents', 'metadatas', 'ids', 'distances'.
    """
    # Normalize user_clearance to its numeric rank
    if isinstance(user_clearance, str):
        level_key = user_clearance.strip().lower()
        clearance_rank = CLEARANCE_LEVELS.get(level_key)
        if clearance_rank is None:
            raise ValueError(
                f"Unknown clearance string: '{user_clearance}'. "
                f"Allowed values: {list(CLEARANCE_LEVELS.keys())} or numeric ranks."
            )
    elif isinstance(user_clearance, (int, float)):
        clearance_rank = int(user_clearance)
    else:
        raise TypeError(f"user_clearance must be str or int, got {type(user_clearance).__name__}")

    collection = get_chroma_collection()
    total_docs = collection.count()

    if total_docs == 0:
        return {
            "ids": [[]],
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]],
        }

    # Query ChromaDB with strict $lte metadata filtering
    # Only documents with document.clearance <= clearance_rank will be matched
    limit = min(n_results, total_docs)
    results = collection.query(
        query_texts=[query],
        n_results=limit,
        where={"clearance": {"$lte": clearance_rank}},
    )

    return results


# -----------------------------------------------------------------------------
# Additional Helper Functions for Backend Integration
# -----------------------------------------------------------------------------
def get_user(user_id: str) -> Optional[User]:
    """
    Fetches a User record from SQLite by user_id.
    """
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.user_id == user_id).first()
        if user:
            session.expunge(user)
        return user
    finally:
        session.close()


def get_user_clearance(user_id: str) -> Optional[str]:
    """
    Helper to fetch a user's clearance level string directly from SQLite.
    Returns None if user is not found.
    """
    user = get_user(user_id)
    return user.clearance_level if user else None
