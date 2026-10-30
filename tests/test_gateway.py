"""Focused local gateway behavior with an in-process synthetic upstream."""
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
from sqlalchemy import create_engine, inspect
import httpx
from fastapi.testclient import TestClient
import test_integration as fixtures
from database import db_client
from gateway.state import state
from traffic_ingest import scraping_detector
import protected_api

app = fixtures.app


class GatewayTests(unittest.TestCase):
    def setUp(self):
        db_client.reset_db()
        app.load_openapi_spec()
        app.ip_request_timestamps.clear()
        app.alert_dedup_cache.clear()
        app.hyperion_event_buffer.clear()
        from hyperion_security_engine.bola_detector import BOLADetector
        from hyperion_security_engine.token_misuse_detector import TokenMisuseDetector
        app.runtime_detectors = [BOLADetector(alert_cool_down_seconds=0),
                                 TokenMisuseDetector(ip_threshold=2, alert_cool_down_seconds=0)]
        state.enabled = True
        state.shadow_policy = "FLAG"
        state.rate_limit = 10
        state.rate_window_seconds = 10
        state._hits.clear()
        scraping_detector.client_events.clear()
        scraping_detector.last_alert_time.clear()
        os.environ["HYPERION_GATEWAY_ADMIN_SECRET"] = "isolated-test-secret"
        app.app.state.gateway_transport = httpx.ASGITransport(app=protected_api.app)
        self.client = TestClient(app.app)

    def tearDown(self):
        self.client.close()
        del app.app.state.gateway_transport
        os.environ.pop("HYPERION_GATEWAY_ADMIN_SECRET", None)

    @classmethod
    def tearDownClass(cls):
        db_client.engine.dispose()

    def control(self, **values):
        return self.client.post("/api/governance/gateway", json=values,
                                headers={"X-Gateway-Admin-Secret": "isolated-test-secret"})

    def normal(self, path="/gateway/api/v1/users/user_101"):
        return self.client.get(path, headers={"Authorization": "Bearer demo-user-101"})

    def test_known_route_forwards_once_and_hierarchy_works(self):
        response = self.normal()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], "user_101")
        self.assertEqual(response.headers["x-hyperion-decision"], "ALLOW")
        rows = self.client.get("/api/traffic").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["source"], "gateway")
        self.assertEqual(rows[0]["request_id"], response.headers["x-hyperion-request-id"])
        hierarchy = self.client.get("/api/risk-hierarchy").json()
        self.assertIn("platform", hierarchy)
        self.assertTrue(hierarchy["services"])

    def test_shadow_flag_and_block_with_evidence(self):
        flag = self.normal("/gateway/api/v2/debug")
        self.assertEqual(flag.status_code, 200)
        self.assertEqual(flag.headers["x-hyperion-decision"], "FLAG")
        self.assertEqual(self.control(shadow_policy="BLOCK").status_code, 200)
        blocked = self.normal("/gateway/api/v2/debug")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.headers["x-hyperion-decision"], "BLOCK")
        rows = self.client.get("/api/traffic").json()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["status_code"], 403)
        self.assertEqual(rows[0]["upstream_status_code"], None)
        self.assertTrue(rows[0]["finding_ids"])
        self.assertEqual(self.client.get("/api/traffic/" + str(rows[0]["id"])).status_code, 200)
        self.assertEqual(self.client.get("/api/execution-flow?event_id=" + str(rows[0]["id"])).status_code, 200)

    def test_rate_limit_returns_429_and_records_attempt(self):
        state.rate_limit = 2
        self.assertEqual(self.normal().status_code, 200)
        self.assertEqual(self.normal().status_code, 200)
        denied = self.normal()
        self.assertEqual(denied.status_code, 429)
        self.assertEqual(denied.headers["x-hyperion-decision"], "BLOCK")
        rows = self.client.get("/api/traffic").json()
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["decision_reason"], "RATE_LIMIT")
        self.assertTrue(rows[0]["finding_ids"])

    def test_upstream_unavailable_is_502_with_one_record(self):
        def offline(request):
            raise httpx.ConnectError("offline", request=request)
        app.app.state.gateway_transport = httpx.MockTransport(offline)
        response = self.normal()
        self.assertEqual(response.status_code, 502)
        rows = self.client.get("/api/traffic").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["decision_reason"], "UPSTREAM_UNAVAILABLE")

    def test_toggle_actually_bypasses_policy_and_requires_secret(self):
        self.assertEqual(self.client.post("/api/governance/gateway", json={"enabled": False}).status_code, 403)
        self.assertEqual(self.control(shadow_policy="BLOCK", enabled=False).status_code, 200)
        bypass = self.normal("/gateway/api/v2/debug")
        self.assertEqual(bypass.status_code, 200)
        self.assertEqual(bypass.headers["x-hyperion-decision"], "ALLOW")
        self.assertEqual(self.client.get("/api/traffic").json()[0]["decision_reason"], "BYPASSED")
        self.assertEqual(self.control(enabled=True).status_code, 200)
        self.assertEqual(self.normal("/gateway/api/v2/debug").status_code, 403)

    def test_bola_and_parameter_mismatch_have_linked_findings(self):
        bola = self.normal("/gateway/api/v1/users/user_202")
        self.assertEqual(bola.status_code, 200)
        self.assertEqual(bola.headers["x-hyperion-decision"], "FLAG")
        mismatch = self.client.post("/gateway/api/v1/payments",
            headers={"Authorization": "Bearer demo-user-101"},
            json={"from_account_id": "account_202", "to_account_id": "account_101", "amount": 10})
        self.assertEqual(mismatch.status_code, 403)
        self.assertEqual(mismatch.headers["x-hyperion-decision"], "FLAG")
        alerts = self.client.get("/api/alerts").json()
        self.assertIn("bola", [row["alert_type"] for row in alerts])
        self.assertIn("parameter_tampering", [row["alert_type"] for row in alerts])
        self.assertTrue(all(row["related_event_ids"] for row in alerts))
        hierarchy = self.client.get("/api/risk-hierarchy").json()
        self.assertGreater(hierarchy["platform"]["active_alerts_count"], 0)

    def test_existing_scraping_detector_sees_gateway_attempts(self):
        state.rate_limit = 30
        for _ in range(16):
            self.assertEqual(self.normal().status_code, 200)
        alerts = self.client.get("/api/alerts").json()
        self.assertIn("scraping", [row["alert_type"] for row in alerts])
        self.assertEqual(len(self.client.get("/api/traffic").json()), 16)

    def test_header_filtering_query_and_body_forwarding(self):
        seen = []
        def inspect_upstream(request):
            seen.append(request)
            return httpx.Response(200, json={"synthetic": True}, headers={"X-Private-Upstream": "omit"})
        app.app.state.gateway_transport = httpx.MockTransport(inspect_upstream)
        response = self.client.post("/gateway/api/v1/payments?mode=demo",
            headers={"Authorization": "Bearer demo-user-101", "X-Forwarded-For": "203.0.113.9",
                     "X-Gateway-Admin-Secret": "should-not-forward", "X-Private": "omit"},
            json={"from_account_id": "account_101", "to_account_id": "account_202", "amount": 10})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(seen), 1)
        self.assertEqual(seen[0].url.host, "127.0.0.1")
        self.assertEqual(seen[0].url.port, 8001)
        self.assertEqual(seen[0].url.query, b"mode=demo")
        self.assertIn(b'"from_account_id"', seen[0].content)
        self.assertEqual(seen[0].headers["authorization"], "Bearer demo-user-101")
        self.assertNotIn("x-forwarded-for", seen[0].headers)
        self.assertNotIn("x-gateway-admin-secret", seen[0].headers)
        self.assertNotIn("x-private-upstream", response.headers)

    def test_request_and_response_bounds_record_attempts(self):
        too_large = self.client.post("/gateway/api/v1/payments", content=b"x" * (64 * 1024 + 1))
        self.assertEqual(too_large.status_code, 413)
        def huge(request):
            return httpx.Response(200, content=b"x" * (256 * 1024 + 1))
        app.app.state.gateway_transport = httpx.MockTransport(huge)
        oversized_response = self.normal()
        self.assertEqual(oversized_response.status_code, 502)
        rows = self.client.get("/api/traffic").json()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["decision_reason"], "UPSTREAM_RESPONSE_TOO_LARGE")
        self.assertEqual(rows[1]["decision_reason"], "REQUEST_TOO_LARGE")

    def test_token_reuse_uses_direct_peer_not_forwarding_header(self):
        for last in (1, 2, 3):
            with TestClient(app.app, client=(f"127.0.0.{last}", 50000)) as client:
                response = client.get("/gateway/api/v1/users/user_101",
                    headers={"Authorization": "Bearer demo-user-101", "X-Forwarded-For": "198.51.100.7"})
                self.assertEqual(response.status_code, 200)
        rows = self.client.get("/api/traffic").json()
        self.assertEqual({row["caller_ip"] for row in rows}, {"127.0.0.1", "127.0.0.2", "127.0.0.3"})
        alerts = self.client.get("/api/alerts").json()
        self.assertIn("token_replay", [row["alert_type"] for row in alerts])

    def test_existing_traffic_database_migrates_without_losing_row(self):
        with tempfile.TemporaryDirectory(prefix="hyperion-gateway-migrate-") as folder:
            legacy = Path(folder) / "legacy.db"
            with closing(sqlite3.connect(legacy)) as connection, connection:
                connection.execute("CREATE TABLE traffic_logs (id INTEGER PRIMARY KEY, timestamp TEXT, method TEXT, endpoint TEXT, caller_ip TEXT, token_user_id TEXT, target_resource_id TEXT, payload_size_bytes INTEGER, token TEXT, auth_type TEXT, status_code INTEGER)")
                connection.execute("INSERT INTO traffic_logs (id, timestamp, method, endpoint, status_code) VALUES (1, '2026-01-01T00:00:00+00:00', 'GET', '/api/v1/users/{id}', 200)")
            legacy_engine = create_engine(f"sqlite:///{legacy}")
            try:
                with patch.object(db_client, "engine", legacy_engine):
                    db_client.init_db()
                    db_client.init_db()
                columns = {column["name"] for column in inspect(legacy_engine).get_columns("traffic_logs")}
                self.assertIn("gateway_decision", columns)
                self.assertIn("request_id", columns)
                with closing(sqlite3.connect(legacy)) as connection:
                    self.assertEqual(connection.execute("SELECT COUNT(*) FROM traffic_logs").fetchone()[0], 1)
            finally:
                legacy_engine.dispose()

    def test_encoded_route_bypass_is_blocked(self):
        response = self.normal("/gateway/api/v1/users/%2e%2e/debug")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get("/api/traffic").json()[0]["decision_reason"], "INVALID_PATH")

    def test_fixed_professor_demonstration_verifies_persisted_outcomes(self):
        for scenario, expected in (("legitimate", 200), ("shadow", 200),
                                   ("rate", 429), ("bola", 200), ("tamper", 403)):
            with self.subTest(scenario=scenario):
                response = self.client.post("/api/governance/gateway-demo/run",
                                            json={"scenario": scenario, "authorized": True})
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertTrue(result["verified"], result)
                self.assertEqual(result["event"]["status_code"], expected)
                self.assertEqual(result["event"]["source"], "gateway")
                self.assertIsNone(result["event"]["token"])
        self.assertEqual(self.control(enabled=True, shadow_policy="BLOCK").status_code, 200)
        blocked = self.client.post("/api/governance/gateway-demo/run",
                                   json={"scenario": "shadow", "authorized": True}).json()
        self.assertTrue(blocked["verified"], blocked)
        self.assertEqual(blocked["event"]["status_code"], 403)
        self.assertEqual(blocked["event"]["gateway_decision"], "BLOCK")


if __name__ == "__main__":
    unittest.main()
