"""Persist exactly one gateway attempt and connect findings to request evidence."""
import json
import time
from datetime import datetime, timezone
from database import db_client
from database.models import TrafficLogDB
from engine.risk_scorer import evaluate_endpoint_from_state
from hyperion_security_engine.event import APIEvent
from hyperion_security_engine.scraping_detector import ScrapingDetector
from threading import Lock

scraping_detector = ScrapingDetector(time_window_seconds=10, request_threshold_high=15,
    request_threshold_moderate=15, endpoint_threshold=0, alert_cool_down_seconds=5)
scraping_lock = Lock()


def record_gateway(*, request_id, method, endpoint, client, status_code, upstream_status,
                   decision, reason, latency_ms, request_size, response_size, known,
                   auth_type, user_id, token, target_id, owner, permission, tampered,
                   service_id, analyze):
    stamp = datetime.now(timezone.utc).isoformat()
    log = db_client.save_traffic_log(dict(
        timestamp=stamp, method=method, endpoint=endpoint, caller_ip=client,
        token_user_id=user_id, target_resource_id=target_id, payload_size_bytes=request_size,
        token=None, auth_type=auth_type, status_code=status_code, request_id=request_id,
        source="gateway", gateway_decision=decision, decision_reason=reason,
        upstream_status_code=upstream_status, response_size_bytes=response_size,
        latency_ms=latency_ms, service_identifier=service_id,
    ))
    finding_ids = []

    def finding(kind, severity, detail):
        alert = db_client.create_alert(timestamp=stamp, endpoint=endpoint, alert_type=kind,
            severity=severity, details=detail, caller_ip=client, related_event_id=log.id)
        finding_ids.append(alert.id)

    if not known:
        prefix = "Gateway-enforced rejection" if decision == "BLOCK" else "Observed anomaly"
        finding("SHADOW_API", "HIGH" if decision == "BLOCK" else "MEDIUM",
                f"{prefix}: {method} {endpoint} is absent from the protected API allowlist.")
    if reason == "RATE_LIMIT":
        finding("RATE_LIMIT", "MEDIUM", "Gateway-enforced rejection: per-client request limit exceeded.")
    if reason == "INVALID_PATH":
        finding("INVALID_PATH", "HIGH", "Gateway-enforced rejection: ambiguous or unsafe route path.")
    if tampered:
        finding("PARAMETER_TAMPERING", "HIGH",
                "Confirmed synthetic policy violation: payment source account does not belong to the demo caller; no payment processed.")

    # The existing BOLA/token detectors consume only bounded, synthetic context.
    # A 2xx response despite an explicit upstream denial is a confirmed demo
    # policy violation; 403 is merely an observed denied attempt.
    event = APIEvent(event_id=f"traffic-{log.id}", method=method, path=endpoint,
        timestamp=stamp, source_ip=client, api_key=token, user_id=user_id,
        status_code=status_code, resource_owner=owner,
        permission_decision=permission)
    for detected in analyze(event, time.time()):
        kind = {"bola": "BOLA", "token_misuse": "TOKEN_REPLAY",
                "scraping": "SCRAPING"}.get(detected["alert_type"], detected["alert_type"].upper())
        label = "Confirmed synthetic policy violation" if kind == "BOLA" and status_code < 300 else "Observed anomaly"
        finding(kind, detected["severity"].upper(),
                f"{label}: {detected['description']}")

    with scraping_lock:
        scraping_alerts = scraping_detector.detect([event])
    for detected in scraping_alerts:
        finding("SCRAPING", detected.severity.upper(),
                f"Observed anomaly: {detected.description}")

    if finding_ids:
        with db_client.SessionLocal() as session:
            row = session.get(TrafficLogDB, log.id)
            row.finding_ids = json.dumps(finding_ids)
            session.commit()

    alerts = [{"endpoint": row.endpoint, "alert_type": row.alert_type,
               "severity": row.severity} for row in db_client.get_alerts(limit=500)]
    inventory = db_client.get_inventory(limit=500)
    previous = next((row for row in inventory if row.method == method and row.endpoint == endpoint), None)
    effective_auth = auth_type if auth_type != "None" else previous.auth_type if previous and previous.total_calls else "None"
    score, severity, reasons = evaluate_endpoint_from_state(
        method=method, endpoint=endpoint, auth_type=effective_auth, is_shadow=not known,
        contains_pii=False, alerts=alerts)
    db_client.upsert_api_inventory(method=method, endpoint=endpoint, is_shadow=not known,
        risk_score=score, reasons=reasons, auth_type=effective_auth,
        contains_pii=False, severity=severity, increment_call=True)
    return log.id, finding_ids
