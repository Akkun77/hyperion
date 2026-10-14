from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, User, Document, DocumentAccessPermission, SecurityIncident
from datetime import datetime

# Database URL (SQLite)
DATABASE_URL = "sqlite:///./hyperion.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize the database, creating tables and adding seed data."""
    Base.metadata.create_all(bind=engine)
    # Add seed data
    db = SessionLocal()
    try:
        # Check if we already have users
        if db.query(User).count() == 0:
            # Create a demo user
            demo_user = User(
                user_id="demo_user_001",
                name="Demo User",
                email="demo@example.com",
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            
            # Create a demo document
            demo_doc = Document(
                doc_id="demo_doc_001",
                title="Demo Document",
                content="This is a demo document for testing.",
                owner_id=demo_user.id
            )
            db.add(demo_doc)
            db.commit()
            db.refresh(demo_doc)
            
            # Give the user permission to their own document
            permission = DocumentAccessPermission(
                document_id=demo_doc.id,
                user_id=demo_user.id,
                permission_level="owner"
            )
            db.add(permission)
            db.commit()
            
            # Create a demo incident (optional)
            demo_incident = SecurityIncident(
                incident_id="demo_incident_001",
                user_id=demo_user.id,
                document_id=demo_doc.id,
                action_taken="mask",
                explanation="Demo incident: email masked for privacy",
                data_types_detected="email",
                timestamp=datetime.utcnow()
            )
            db.add(demo_incident)
            db.commit()
    finally:
        db.close()

def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
