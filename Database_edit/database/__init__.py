"""
Database module for the AI Security Gateway.
Exposes relational ORM models, ChromaDB vector retrieval, and database management utilities.
"""

from .models import User, AuditLog, CLEARANCE_LEVELS
from .db_client import (
    engine,
    SessionLocal,
    chroma_client,
    get_chroma_collection,
    init_db,
    log_security_incident,
    get_audit_logs,
    retrieve_allowed_context,
    get_user,
    get_user_clearance,
)

__all__ = [
    "User",
    "AuditLog",
    "CLEARANCE_LEVELS",
    "engine",
    "SessionLocal",
    "chroma_client",
    "get_chroma_collection",
    "init_db",
    "log_security_incident",
    "get_audit_logs",
    "retrieve_allowed_context",
    "get_user",
    "get_user_clearance",
]
