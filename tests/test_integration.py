"""Integration tests use an isolated temporary SQLite database only."""
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing

_TEST_DIRECTORY = tempfile.TemporaryDirectory(prefix="hyperion-integration-")
os.environ["HYPERION_DATABASE_PATH"] = str(Path(_TEST_DIRECTORY.name) / "isolated.db")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from unittest.mock import patch
import app
from database import db_client
from hyperion_security_engine.bola_detector import BOLADetector
from hyperion_security_engine.token_misuse_detector import TokenMisuseDetector


class IntegratedPlatformTests(unittest.TestCase):
    def setUp(self):
        self.assertEqual(Path(db_client.DB_FILE).parent, Path(_TEST_DIRECTORY.name))
        db_client.reset_db()
        app.ip_request_timestamps.clear()
        app.alert_dedup_cache.clear()
        app.hyperion_event_buffer.clear()
        app.runtime_detectors = [BOLADetector(alert_cool_down_seconds=5),
                                 TokenMisuseDetector(ip_threshold=2, alert_cool_down_seconds=5)]
        self.client = TestClient(app.app)

    def tearDown(self):
        self.client.close()

    def request_user(self, owner="user_101", ip="192.0.2.1", token="demo-token"):
        return self.client.get(f"/api/v1/users/{owner}",
            headers={"Authorization": f"Bearer {token}", "X-User-Id": "user_101",
                     "X-Forwarded-For": ip})

    def test_health_and_dashboard_reads_do_not_ingest_themselves(self):
        for path in ["/api/health", "/api/governance/kpis", "/api/governance/inventory",
                     "/api/governance/alerts", "/api/traffic", "/api/alerts", "/api/risk-scores",
                     "/api/risk-hierarchy", "/api/execution-flow"]:
            self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertEqual(self.client.get("/api/traffic").json(), [])

    def test_two_shadow_endpoints_and_normalized_managed_inventory(self):
        self.request_user()
        self.client.get("/api/v2/debug")
        self.client.get("/api/v1/admin/export")
        items = self.client.get("/api/governance/inventory").json()
        self.assertEqual({i["endpoint"] for i in items if i["is_shadow"]},
                         {"/api/v2/debug", "/api/v1/admin/export"})
        self.assertFalse(next(i for i in items if i["endpoint"] == "/api/v1/users/{id}")["is_shadow"])

    def test_repeated_dashboard_refresh_preserves_business_counts_and_detection_baselines(self):
        self.request_user()
        before = self.client.get('/api/governance/kpis').json()
        baseline = {key: list(value) for key, value in app.ip_request_timestamps.items()}
        buffer_size = len(app.hyperion_event_buffer)
        for _ in range(4):
            for path in ['/api/health', '/api/governance/kpis', '/api/governance/inventory',
                         '/api/governance/alerts', '/api/traffic', '/api/traffic/1', '/api/alerts',
                         '/api/risk-scores', '/api/risk-hierarchy', '/api/execution-flow?event_id=1']:
                self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertEqual(self.client.get('/api/governance/kpis').json(), before)
        self.assertEqual(dict(app.ip_request_timestamps), baseline)
        self.assertEqual(len(app.hyperion_event_buffer), buffer_size)
        self.assertEqual(self.client.get('/api/alerts').json(), [])
        # A similarly named business route is still monitored; exclusion is exact.
        self.client.get('/api/risk-hierarchy/business-probe')
        self.assertEqual(self.client.get('/api/governance/kpis').json()['total_requests_observed'], 2)

    def test_bola_has_persisted_evidence_and_explained_risk(self):
        self.assertEqual(self.request_user("user_202").status_code, 200)
        alert = self.client.get("/api/alerts").json()[0]
        self.assertEqual(alert["alert_type"], "bola")
        evidence = self.client.get(f"/api/traffic/{alert['related_event_ids'][0]}").json()
        self.assertEqual(evidence["target_resource_id"], "user_202")
        self.assertEqual(evidence["status_code"], 200)
        risk = self.client.get("/api/risk-scores").json()[0]
        self.assertGreaterEqual(risk["score"], 50)
        self.assertTrue(any("BOLA" in factor for factor in risk["factors"]))

    def test_distinguish_blocked_attempt_from_confirmed_bola_violation(self):
        # 1. Correctly blocked access attempt (status 403)
        res_blocked = self.client.get("/api/v1/users/user_202",
            headers={"Authorization": "Bearer demo-token", "X-User-Id": "user_101",
                     "X-Forwarded-For": "192.0.2.1", "X-Enforce-Auth": "true"})
        self.assertEqual(res_blocked.status_code, 403)
        traffic = self.client.get("/api/traffic").json()
        self.assertEqual(len(traffic), 1)
        self.assertEqual(traffic[0]["status_code"], 403)
        self.assertEqual(self.client.get("/api/alerts").json(), [])

        # 2. Confirmed authorization violation (status 200, access granted)
        res_violation = self.client.get("/api/v1/users/user_202",
            headers={"Authorization": "Bearer demo-token", "X-User-Id": "user_101",
                     "X-Forwarded-For": "192.0.2.1"})
        self.assertEqual(res_violation.status_code, 200)
        alerts = self.client.get("/api/alerts").json()
        self.assertEqual(len(alerts), 1)
        alert = alerts[0]
        self.assertEqual(alert["alert_type"], "bola")
        self.assertTrue(alert["related_event_ids"])
        evidence = self.client.get(f"/api/traffic/{alert['related_event_ids'][0]}").json()
        self.assertEqual(evidence["user_id"], "user_101")
        self.assertEqual(evidence["target_resource_id"], "user_202")
        self.assertEqual(evidence["status_code"], 200)

    def test_token_misuse_and_unrelated_request_does_not_repeat_it(self):
        for i in range(3):
            self.request_user(ip=f"192.0.2.{i+1}")
        alerts = self.client.get("/api/alerts").json()
        self.assertEqual([a["alert_type"] for a in alerts], ["token_replay"])
        self.assertTrue(alerts[0]["related_event_ids"])
        for detector in app.runtime_detectors:
            detector.last_alert_time.clear()
        self.request_user(ip="192.0.2.99", token="different-token")
        self.assertEqual(len(self.client.get("/api/alerts").json()), 1)

    def test_scraping_and_evidence(self):
        for _ in range(16):
            self.request_user(ip="198.51.100.18")
        alert = next(a for a in self.client.get("/api/alerts").json() if a["alert_type"] == "scraping")
        self.assertTrue(alert["related_event_ids"])
        evidence = self.client.get(f"/api/traffic/{alert['related_event_ids'][0]}")
        self.assertEqual(evidence.status_code, 200)

    def test_actual_error_status_is_recorded(self):
        self.assertEqual(self.client.get("/api/v1/missing-demo-route").status_code, 404)
        self.assertEqual(self.client.get("/api/traffic").json()[0]["status_code"], 404)
        self.assertEqual(self.client.get("/api/traffic/999999").status_code, 404)

    def test_init_is_idempotent_and_totals_match_persistence(self):
        self.request_user()
        db_client.init_db()
        db_client.init_db()
        self.assertEqual(len(db_client.get_traffic_logs()), 1)
        kpis = self.client.get("/api/governance/kpis").json()
        self.assertEqual(kpis["total_requests_observed"], 1)
        self.assertEqual(kpis["total_apis"], 1)

    def test_additive_migration_preserves_legacy_alert(self):
        legacy = Path(_TEST_DIRECTORY.name) / "legacy.db"
        with closing(sqlite3.connect(legacy)) as connection, connection:
            connection.execute("CREATE TABLE security_alerts (id INTEGER PRIMARY KEY, details TEXT)")
            connection.execute("INSERT INTO security_alerts (id, details) VALUES (1, 'legacy example')")
        legacy_engine = create_engine(f"sqlite:///{legacy}")
        try:
            with patch.object(db_client, "engine", legacy_engine):
                db_client.init_db()
                db_client.init_db()
            self.assertIn("related_event_id", {c["name"] for c in inspect(legacy_engine).get_columns("security_alerts")})
            with closing(sqlite3.connect(legacy)) as connection:
                self.assertEqual(connection.execute("SELECT details FROM security_alerts WHERE id=1").fetchone()[0],
                                 "legacy example")
        finally:
            legacy_engine.dispose()

    def test_risk_hierarchy_aggregates_services_and_explains_drivers(self):
        self.request_user("user_101")
        self.client.get("/api/v2/debug")
        self.client.get("/api/v1/admin/export")
        res = self.client.get("/api/risk-hierarchy")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("platform", data)
        self.assertIn("services", data)
        self.assertGreaterEqual(data["platform"]["total_services"], 2)
        self.assertGreaterEqual(data["platform"]["total_shadow_endpoints"], 2)
        self.assertTrue(0 <= data["platform"]["risk_score"] <= 100)
        service_names = [s["name"] for s in data["services"]]
        self.assertTrue(any("Identity" in name for name in service_names))
        self.assertTrue(any("Infrastructure" in name or "Governance" in name for name in service_names))
        for svc in data["services"]:
            self.assertTrue(0 <= svc["risk_score"] <= 100)
            self.assertIn(svc["severity"], ("LOW", "MEDIUM", "HIGH", "CRITICAL"))
            self.assertTrue(len(svc["endpoints"]) > 0)
            self.assertTrue(len(svc["drivers"]) > 0)

    def test_execution_flow_traces_request_to_evidence(self):
        # Trigger BOLA to create alert and linked traffic event
        self.assertEqual(self.request_user("user_202").status_code, 200)
        res = self.client.get("/api/execution-flow")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_data"])
        self.assertEqual(len(data["stages"]), 7)
        stage_names = [s["name"] for s in data["stages"]]
        self.assertIn("Incoming Edge Request", stage_names[0])
        self.assertIn("Endpoint", stage_names[1])
        self.assertIn("Traffic Log", stage_names[2])
        self.assertIn("Security Engine", stage_names[3])
        self.assertIn("Alert", stage_names[4])
        self.assertIn("Risk", stage_names[5])
        self.assertIn("Evidence", stage_names[6])
        self.assertIsNotNone(data["stages"][6]["meta"]["Linked Traffic ID"])

    @classmethod
    def tearDownClass(cls):
        db_client.engine.dispose()
        _TEST_DIRECTORY.cleanup()


if __name__ == "__main__":
    unittest.main()
