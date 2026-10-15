import os
import json
from datetime import datetime, timezone
from sqlalchemy import create_engine, desc, inspect, text, func
from sqlalchemy.orm import sessionmaker

from .models import Base, TrafficLogDB, APIEndpointDB, SecurityAlertDB

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.abspath(os.path.expanduser(os.environ.get(
    "HYPERION_DATABASE_PATH", os.path.join(DB_DIR, "api_security.db")
)))
os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create tables and apply the additive compatibility migration."""
    Base.metadata.create_all(bind=engine)

    # ``create_all`` deliberately does not alter existing SQLite tables.  The
    # project database can therefore predate this nullable evidence field.
    # Add it in place so existing telemetry remains readable.
    with engine.begin() as connection:
        columns = {
            column["name"]
            for column in inspect(connection).get_columns("security_alerts")
        }
        if "related_event_id" not in columns:
            connection.execute(
                text("ALTER TABLE security_alerts ADD COLUMN related_event_id INTEGER")
            )


def reset_db():
    """Drop and recreate all tables for a fresh state."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def save_traffic_log(log_data: dict):
    """Save a traffic log to the database."""
    db = SessionLocal()
    try:
        log = TrafficLogDB(**log_data)
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    finally:
        db.close()


def upsert_api_inventory(
    method: str,
    endpoint: str,
    is_shadow: bool,
    risk_score: int,
    reasons,
    auth_type: str = "None",
    contains_pii: bool = False,
    severity: str = "LOW",
    increment_call: bool = True
):
    """
    Insert or update an API endpoint in the inventory.
    reasons can be a JSON string or a python list/dict.
    """
    db = SessionLocal()
    try:
        if isinstance(reasons, (list, dict)):
            reasons_str = json.dumps(reasons)
        else:
            reasons_str = str(reasons)

        api = db.query(APIEndpointDB).filter_by(method=method, endpoint=endpoint).first()
        now_iso = datetime.now(timezone.utc).isoformat()

        if api:
            api.is_shadow = is_shadow
            api.risk_score = risk_score
            api.risk_reasons = reasons_str
            api.severity = severity
            api.last_seen = now_iso
            if auth_type != "None" or not api.auth_type or api.auth_type in ("None", "Not observed"):
                api.auth_type = auth_type
            if contains_pii:
                api.contains_pii = True
            if increment_call:
                api.total_calls = (api.total_calls or 0) + 1
        else:
            api = APIEndpointDB(
                method=method,
                endpoint=endpoint,
                is_shadow=is_shadow,
                risk_score=risk_score,
                risk_reasons=reasons_str,
                alert_count=0,
                auth_type=auth_type,
                contains_pii=contains_pii,
                total_calls=1,
                severity=severity,
                last_seen=now_iso
            )
            db.add(api)

        db.commit()
        db.refresh(api)
        return api
    finally:
        db.close()


def create_alert(timestamp: str, endpoint: str, alert_type: str, severity: str, details: str, caller_ip: str = None, related_event_id: int = None):
    """Create a security alert and increment alert count for the API."""
    db = SessionLocal()
    try:
        alert = SecurityAlertDB(
            timestamp=timestamp,
            endpoint=endpoint,
            alert_type=alert_type,
            severity=severity,
            caller_ip=caller_ip,
            details=details,
            related_event_id=related_event_id
        )
        db.add(alert)

        # Increment alert count for matching endpoints
        apis = db.query(APIEndpointDB).filter_by(endpoint=endpoint).all()
        for api in apis:
            api.alert_count = (api.alert_count or 0) + 1
        
        db.commit()
        db.refresh(alert)
        return alert
    finally:
        db.close()


def get_traffic_log_by_id(log_id: int):
    """Get a traffic log by its ID."""
    db = SessionLocal()
    try:
        return db.query(TrafficLogDB).filter_by(id=log_id).first()
    finally:
        db.close()


def get_inventory(skip: int = 0, limit: int = 100):
    """Get all API endpoints."""
    db = SessionLocal()
    try:
        return db.query(APIEndpointDB).order_by(desc(APIEndpointDB.risk_score)).offset(skip).limit(limit).all()
    finally:
        db.close()


def get_dashboard_totals():
    """Count the full persisted dataset instead of a limited UI page."""
    with SessionLocal() as db:
        return {
            "total_requests_observed": db.query(func.count(TrafficLogDB.id)).scalar(),
            "active_alerts": db.query(func.count(SecurityAlertDB.id)).scalar(),
            "critical_alerts": db.query(func.count(SecurityAlertDB.id)).filter(
                SecurityAlertDB.severity.in_(("CRITICAL", "HIGH"))
            ).scalar(),
            "high_risk_endpoints": db.query(func.count(APIEndpointDB.id)).filter(
                APIEndpointDB.risk_score > 60
            ).scalar(),
        }


def get_alerts(skip: int = 0, limit: int = 100):
    """Get security alerts ordered by newest first."""
    db = SessionLocal()
    try:
        return db.query(SecurityAlertDB).order_by(desc(SecurityAlertDB.id)).offset(skip).limit(limit).all()
    finally:
        db.close()


def get_traffic_logs(skip: int = 0, limit: int = 100):
    """Get traffic logs ordered by newest first."""
    db = SessionLocal()
    try:
        return db.query(TrafficLogDB).order_by(desc(TrafficLogDB.id)).offset(skip).limit(limit).all()
    finally:
        db.close()
