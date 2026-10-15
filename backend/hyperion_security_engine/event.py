# security_engine/event.py
"""
Normalized API traffic event schema for security detection.
Based on the APITrafficEvent from the API spec, with optional authorization fields
expected to be provided by the test API/backend for BOLA detection.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class APIEvent:
    """Normalized API traffic event for security analysis."""
    
    event_id: str
    method: str  # HTTP method: GET, POST, PUT, DELETE, etc.
    path: str    # Normalized endpoint path (e.g., /api/users/{id})
    timestamp: str  # ISO format timestamp
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    api_key: Optional[str] = None
    user_id: Optional[int] = None
    status_code: Optional[int] = None
    body: Optional[str] = None
    response_body: Optional[str] = None
    headers: Optional[str] = None  # JSON string of request headers
    response_headers: Optional[str] = None  # JSON string of response headers
    query_params: Optional[str] = None  # JSON string of query parameters
    # Optional authorization fields (expected from test API/backend)
    resource_owner: Optional[str] = None  # Owner ID of the resource being accessed
    permission_decision: Optional[str] = None  # Authorization decision: 'allow', 'deny', etc.
    authorization_context: Optional[str] = None  # Additional context

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "event_id": self.event_id,
            "method": self.method,
            "path": self.path,
            "timestamp": self.timestamp,
            "source_ip": self.source_ip,
            "user_agent": self.user_agent,
            "api_key": self.api_key,
            "user_id": self.user_id,
            "status_code": self.status_code,
            "body": self.body,
            "response_body": self.response_body,
            "headers": self.headers,
            "response_headers": self.response_headers,
            "query_params": self.query_params,
            "resource_owner": self.resource_owner,
            "permission_decision": self.permission_decision,
            "authorization_context": self.authorization_context,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "APIEvent":
        """Create from dictionary."""
        return cls(
            event_id=data["event_id"],
            method=data["method"],
            path=data["path"],
            timestamp=data["timestamp"],
            source_ip=data.get("source_ip"),
            user_agent=data.get("user_agent"),
            api_key=data.get("api_key"),
            user_id=data.get("user_id"),
            status_code=data.get("status_code"),
            body=data.get("body"),
            response_body=data.get("response_body"),
            headers=data.get("headers"),
            response_headers=data.get("response_headers"),
            query_params=data.get("query_params"),
            resource_owner=data.get("resource_owner"),
            permission_decision=data.get("permission_decision"),
            authorization_context=data.get("authorization_context"),
        )
