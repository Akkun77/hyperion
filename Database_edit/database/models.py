"""
models.py
SQLAlchemy schemas for the AI Security Gateway.

Defines:
- User: relational entity holding user IDs and clearance levels.
- AuditLog: security incident audit log capturing policy interventions.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Clearance level hierarchy mapping string levels to numeric ranks for comparison
CLEARANCE_LEVELS: Dict[str, int] = {
    "public": 1,
    "internal": 2,
    "confidential": 3,
}

CLEARANCE_NAMES: Dict[int, str] = {v: k for k, v in CLEARANCE_LEVELS.items()}


class User(Base):
    """
    User model representing an identity within the AI Security Gateway
    along with their authorized security clearance level.
    """
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True, nullable=False)
    clearance_level = Column(String, nullable=False)  # e.g., 'public', 'internal', 'confidential'

    def __repr__(self) -> str:
        return f"<User(user_id='{self.user_id}', clearance_level='{self.clearance_level}')>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "clearance_level": self.clearance_level,
        }


class AuditLog(Base):
    """
    AuditLog model recording all security checks, policy violations,
    and gateway routing/blocking actions.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user_id = Column(String, nullable=False, index=True)
    policy_triggered = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, timestamp='{self.timestamp}', "
            f"user_id='{self.user_id}', policy_triggered='{self.policy_triggered}', "
            f"action_taken='{self.action_taken}')>"
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_id": self.user_id,
            "policy_triggered": self.policy_triggered,
            "action_taken": self.action_taken,
        }
