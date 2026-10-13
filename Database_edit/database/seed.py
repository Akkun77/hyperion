"""
seed.py
Database initialization and seeding script for the AI Security Gateway.

Performs:
1. Creation of SQLite relational database tables (User, AuditLog).
2. Seeding of 3 mock users with clearance levels (public, internal, confidential).
3. Embedding and persistence of 3 clearance-tagged mock documents in ChromaDB:
   - Doc 1: "Public roadmap" (clearance: 1)
   - Doc 2: "Internal financials" (clearance: 2)
   - Doc 3: "Admin passwords" (clearance: 3)
4. Verification queries demonstrating clearance-filtered retrieval.
"""

import sys
import os

# Ensure the project root and database folder are on the Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
for path in [PROJECT_ROOT, CURRENT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from database.models import User, AuditLog
    from database.db_client import (
        SessionLocal,
        init_db,
        get_chroma_collection,
        log_security_incident,
        get_audit_logs,
        retrieve_allowed_context,
    )
except ImportError:
    from models import User, AuditLog
    from db_client import (
        SessionLocal,
        init_db,
        get_chroma_collection,
        log_security_incident,
        get_audit_logs,
        retrieve_allowed_context,
    )


def seed_relational_data():
    """
    Seeds mock users into the SQLite database.
    """
    session = SessionLocal()
    try:
        mock_users = [
            {"user_id": "user_public", "clearance_level": "public"},
            {"user_id": "user_internal", "clearance_level": "internal"},
            {"user_id": "user_confidential", "clearance_level": "confidential"},
        ]

        print("--> Seeding SQLite Users...")
        for user_data in mock_users:
            existing = session.query(User).filter(User.user_id == user_data["user_id"]).first()
            if not existing:
                user = User(
                    user_id=user_data["user_id"],
                    clearance_level=user_data["clearance_level"]
                )
                session.add(user)
                print(f"    [+] Created User: {user.user_id} (Clearance: {user.clearance_level})")
            else:
                existing.clearance_level = user_data["clearance_level"]
                print(f"    [=] User {existing.user_id} already exists. Clearance: {existing.clearance_level}")

        session.commit()
    except Exception as e:
        session.rollback()
        print(f"[!] Error seeding relational data: {e}")
        raise
    finally:
        session.close()


def seed_vector_data():
    """
    Embeds and persists mock documents into ChromaDB collection with clearance metadata.
    """
    collection = get_chroma_collection()

    mock_docs = [
        {
            "id": "doc_1",
            "document": "Public roadmap: Project Alpha will release Q4 features to all users including community edition and open API endpoints.",
            "metadata": {
                "title": "Public roadmap",
                "clearance": 1,
                "clearance_level": "public",
            },
        },
        {
            "id": "doc_2",
            "document": "Internal financials: Q3 enterprise revenue was $4.2M with operating margins of 28% across North America and APAC.",
            "metadata": {
                "title": "Internal financials",
                "clearance": 2,
                "clearance_level": "internal",
            },
        },
        {
            "id": "doc_3",
            "document": "Admin passwords: The root encryption keys, production database credentials, and cluster tokens are stored in vault-sec-prod.",
            "metadata": {
                "title": "Admin passwords",
                "clearance": 3,
                "clearance_level": "confidential",
            },
        },
    ]

    print("--> Seeding ChromaDB Collection ('secure_documents')...")
    ids = [d["id"] for d in mock_docs]
    documents = [d["document"] for d in mock_docs]
    metadatas = [d["metadata"] for d in mock_docs]

    # upsert ensures idempotency when running the seed script repeatedly
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )

    for doc in mock_docs:
        print(f"    [+] Upserted Chroma Doc: ID={doc['id']}, Title='{doc['metadata']['title']}', Clearance={doc['metadata']['clearance']}")

    print(f"    Total documents in collection: {collection.count()}")


def seed_sample_audit_log():
    """
    Seeds an initial audit log entry to test SQLite auditing.
    """
    print("--> Seeding initial security audit log...")
    log = log_security_incident(
        user_id="user_public",
        policy="unauthorized_confidential_access_attempt",
        action="blocked_and_redacted"
    )
    print(f"    [+] Logged incident: ID={log.id}, User={log.user_id}, Policy={log.policy_triggered}, Action={log.action_taken}")


def verify_clearance_filtering():
    """
    Runs test retrieval queries across the 3 clearance levels to verify
    strict vector filtering.
    """
    print("\n" + "=" * 60)
    print("VERIFICATION: Testing Vector Search Clearance Filtering")
    print("=" * 60)

    test_query = "What are the project details, financials, and admin passwords?"

    for level in ["public", "internal", "confidential"]:
        print(f"\n[*] Querying with Clearance: '{level}'")
        res = retrieve_allowed_context(query=test_query, user_clearance=level, n_results=10)
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]

        print(f"    Returned {len(docs)} document(s):")
        for i, (doc, meta) in enumerate(zip(docs, metas), 1):
            print(f"      {i}. [{meta.get('title')}] (Clearance: {meta.get('clearance')} - {meta.get('clearance_level')}): {doc[:60]}...")


def main():
    print("=" * 60)
    print("Initializing AI Security Gateway Database Layer")
    print("=" * 60)

    # 1. Initialize SQLite schema and ChromaDB collection
    print("--> Creating database tables and initializing ChromaDB...")
    init_db()

    # 2. Seed mock users
    seed_relational_data()

    # 3. Seed mock documents with clearance metadata
    seed_vector_data()

    # 4. Seed a sample audit log
    seed_sample_audit_log()

    # 5. Run verification tests
    verify_clearance_filtering()

    print("\n[SUCCESS] Database initialization and seeding complete.")


if __name__ == "__main__":
    main()
