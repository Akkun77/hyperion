"""Run the existing append-only simulation and verify persisted demo evidence."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time
from datetime import datetime

import requests

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))
from engine.risk_scorer import evaluate_endpoint_from_state

BASE = os.environ.get("HYPERION_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
DB = Path(os.environ.get("HYPERION_DATABASE_PATH", str(ROOT / "backend/database/api_security.db"))).resolve()


def get(path):
    response = requests.get(BASE + path, timeout=15)
    response.raise_for_status()
    return response.json()


def main():
    with sqlite3.connect(DB) as db:
        before = {
            table: db.execute(f"SELECT * FROM {table} ORDER BY id").fetchall()
            for table in ("traffic_logs", "security_alerts")
        }
        backup = DB.with_name(f"api_security.pre-demo-{datetime.now():%Y%m%d-%H%M%S}.db")
        with sqlite3.connect(backup) as destination:
            db.backup(destination)
    print(f"Database snapshot: {backup}", flush=True)
    paths = ["/api/health", "/api/governance/kpis", "/api/governance/inventory",
             "/api/governance/alerts", "/api/traffic", "/api/alerts", "/api/risk-scores"]
    for path in paths:
        get(path)
        print(f"HTTP 200 {path}", flush=True)
    subprocess.run([sys.executable, str(ROOT / "simulate.py")], check=True, timeout=90)

    alerts = get("/api/alerts?limit=1000")
    prior_ids = {row[0] for row in before["security_alerts"]}
    new_alerts = [alert for alert in alerts if int(alert["alert_id"]) not in prior_ids]
    assert {"bola", "token_replay", "scraping"} <= {a["alert_type"] for a in new_alerts}
    for alert in new_alerts:
        assert alert["related_event_ids"], alert
        evidence = get(f"/api/traffic/{alert['related_event_ids'][0]}")
        assert evidence["id"] == alert["related_event_ids"][0]
        assert evidence["status_code"] == 200
        print(f"Evidence: alert {alert['alert_id']} ({alert['alert_type']}) -> "
              f"traffic {evidence['id']} {evidence['method']} {evidence['endpoint']}")

    inventory = get("/api/governance/inventory")
    assert {"/api/v2/debug", "/api/v1/admin/export"} <= {
        item["endpoint"] for item in inventory if item["is_shadow"]
    }
    score_rows = get("/api/risk-scores?limit=1000")
    assert all(isinstance(row["factors"], list) and 0 <= row["score"] <= 100 for row in score_rows)
    governance_alerts = get("/api/governance/alerts")
    state_alerts = [{"endpoint": a["endpoint"], "alert_type": a["abuse_type"]}
                    for a in governance_alerts[:50]]
    demo_paths = {"/api/v1/users/{id}", "/api/v1/users/{id}/balance", "/api/v1/payments",
                  "/api/v2/debug", "/api/v1/admin/export"}
    for item in inventory:
        if item["endpoint"] not in demo_paths:
            continue
        score, severity, reasons = evaluate_endpoint_from_state(
            item["method"], item["endpoint"], item["auth_type"], item["is_shadow"],
            item["contains_pii"], state_alerts)
        assert (score, severity, reasons) == (item["risk_score"], item["severity"], item["risk_reasons"])
        print(f"Risk verified: {item['endpoint']} = {score}/100 {severity}")

    with sqlite3.connect(DB) as db:
        for table, original in before.items():
            after = db.execute(f"SELECT * FROM {table} ORDER BY id").fetchall()
            assert after[:len(original)] == original, f"Original records changed: {table}"
        totals = {table: db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                  for table in ("traffic_logs", "security_alerts", "api_endpoints")}
        persisted = db.execute("SELECT COUNT(*) FROM security_alerts WHERE related_event_id IS NOT NULL").fetchone()[0]
    kpis = get("/api/governance/kpis")
    assert kpis["total_requests_observed"] == totals["traffic_logs"]
    assert kpis["active_alerts"] == totals["security_alerts"]
    assert kpis["total_apis"] == totals["api_endpoints"]
    assert kpis["high_risk_endpoints"] == sum(item["risk_score"] > 60 for item in inventory)
    # Repeated dashboard polling must not create observed application traffic.
    time.sleep(5)
    for path in paths:
        get(path)
    assert get("/api/governance/kpis") == kpis
    frontend_url = os.environ.get("HYPERION_FRONTEND_URL", "http://127.0.0.1:5173/")
    frontend = requests.get(frontend_url, headers={"Accept": "text/html"}, timeout=15)
    frontend.raise_for_status()
    assert 'id="root"' in frontend.text and '/src/main.tsx' in frontend.text
    cors = requests.get(BASE + "/api/health", headers={"Origin": "http://127.0.0.1:5173"}, timeout=15)
    assert cors.headers.get("access-control-allow-origin") in ("*", "http://127.0.0.1:5173")
    print(json.dumps({"new_alerts": len(new_alerts), "persisted_evidence_links": persisted,
                      "original_records_preserved": True, "polling_does_not_add_traffic": True,
                      "frontend_http_status": frontend.status_code, "kpis": kpis}, indent=2))


if __name__ == "__main__":
    main()
