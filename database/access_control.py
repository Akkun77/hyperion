from sqlalchemy.orm import Session
from .models import DocumentAccessPermission, User, Document

def user_has_permission(db: Session, user_id: int, document_id: int, required_permission: str = "read") -> bool:
    """
    Check if a user has at least the required permission level on a document.
    
    Permission levels: "read", "write", "admin", "owner"
    We consider that "owner" implies all permissions, "admin" implies read and write, etc.
    For simplicity, we'll just check if there is a permission record and if the level is sufficient.
    
    In a real system, we would have a more complex role-based system.
    """
    # For now, we only have a simple permission level string.
    # We'll assume that if the user has any permission record, they have at least read.
    # But let's make it more flexible by defining a hierarchy.
    permission_hierarchy = {
        "read": 1,
        "write": 2,
        "admin": 3,
        "owner": 4
    }
    
    # Get the user's permission level for this document
    perm_record = db.query(DocumentAccessPermission).filter(
        DocumentAccessPermission.user_id == user_id,
        DocumentAccessPermission.document_id == document_id
    ).first()
    
    if not perm_record:
        return False
    
    user_level = perm_record.permission_level
    required_level = required_permission
    
    # If the user's level is at least the required level, return True
    return permission_hierarchy.get(user_level, 0) >= permission_hierarchy.get(required_level, 0)
