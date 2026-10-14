from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)  # external user identifier
    name = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="owner")
    incidents = relationship("SecurityIncident", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String, unique=True, index=True, nullable=False)  # external document identifier
    title = Column(String)
    content = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="documents")
    permissions = relationship("DocumentAccessPermission", back_populates="document")
    incidents = relationship("SecurityIncident", back_populates="document")

class DocumentAccessPermission(Base):
    __tablename__ = "document_access_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    permission_level = Column(String)  # e.g., "read", "write", "admin"
    granted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="permissions")
    user = relationship("User")

class SecurityIncident(Base):
    __tablename__ = "security_incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True, nullable=False)  # external incident identifier
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    action_taken = Column(String)  # allow, mask, block, warn
    explanation = Column(String)
    data_types_detected = Column(String)  # comma-separated list of types detected
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="incidents")
    document = relationship("Document", back_populates="incidents")
