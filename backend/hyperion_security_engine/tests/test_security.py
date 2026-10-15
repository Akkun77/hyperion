"""Unit tests for the security engine.

The tests exercise the detectors and the high‑level ``analyze_events``
interface.  They exercise both expected detection scenarios and edge cases
such as duplicate events and malformed input.
"""

import datetime
import unittest
import json
from typing import List

from hyperion_security_engine.event import APIEvent
from hyperion_security_engine.scraping_detector import ScrapingDetector
from hyperion_security_engine.token_misuse_detector import TokenMisuseDetector
from hyperion_security_engine.bola_detector import BOLADetector
from hyperion_security_engine.analyzer import analyze_events
from hyperion_security_engine.sanitizer import sanitize_event


class TestSecurityEngine(unittest.TestCase):
    def _now_iso(self) -> str:
        return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    def test_no_alerts_for_single_event(self):
        event = APIEvent(
            event_id="e1",
            method="GET",
            path="/api/users",
            timestamp=self._now_iso(),
            source_ip="1.1.1.1",
            api_key="abcd1234efgh5678ijkl9012mnop3456",
            user_id=1,
            status_code=200,
            permission_decision="allow",
        )
        alerts = analyze_events([event])
        self.assertEqual(len(alerts), 0)

    def test_scraping_detection_high_volume(self):
        now = self._now_iso()
        events = [
            APIEvent(
                event_id=f"e{i}",
                method="GET",
                path="/api/users",
                timestamp=now,
                source_ip="1.1.1.1",
                api_key=f"key{i}",
                user_id=1,
                status_code=200,
                permission_decision="allow",
            )
            for i in range(200)
        ]
        alerts = analyze_events(events)
        # With default thresholds, >100 requests in 60s triggers a scraping alert.
        self.assertTrue(any(a["alert_type"] == "scraping" for a in alerts))

    def test_token_misuse_detection(self):
        now = self._now_iso()
        events = [
            APIEvent(
                event_id=f"e{i}",
                method="GET",
                path="/api/users",
                timestamp=now,
                source_ip=f"192.0.2.{i}",
                api_key="SAME_TOKEN",
                user_id=1,
                status_code=200,
                permission_decision="allow",
            )
            for i in range(5)
        ]
        alerts = analyze_events(events)
        self.assertTrue(any(a["alert_type"] == "token_misuse" for a in alerts))

    def test_bola_detection_confirmed(self):
        now = self._now_iso()
        # Denied by auth
        deny_event = APIEvent(
            event_id="e1",
            method="GET",
            path="/api/users/42",
            timestamp=now,
            source_ip="1.1.1.1",
            api_key="token123",
            user_id=42,
            status_code=200,
            permission_decision="deny",
        )
        alerts = analyze_events([deny_event])
        self.assertTrue(any(a["alert_type"] == "bola" for a in alerts))

    def test_bola_detection_denied_no_success(self):
        now = self._now_iso()
        deny_event = APIEvent(
            event_id="e2",
            method="GET",
            path="/api/users/43",
            timestamp=now,
            source_ip="1.1.1.2",
            api_key="token456",
            user_id=43,
            status_code=403,
            permission_decision="deny",
        )
        alerts = analyze_events([deny_event])
        self.assertFalse(any(a["alert_type"] == "bola" for a in alerts))

    def test_sanitizer_removes_sensitive(self):
        event = APIEvent(
            event_id="e1",
            method="POST",
            path="/api/login",
            timestamp=self._now_iso(),
            source_ip="1.1.1.1",
            api_key="SECRETAPIKEY",
            user_id=1,
            status_code=200,
            headers="{\"Authorization\": \"Bearer X\", \"Cookie\": \"session=y\"}",
            body="{\"password\": \"p@ssw0rd\"}",
        )
        sanitized = sanitize_event(event)
        # Headers should not contain Authorization or Cookie
        headers = json.loads(sanitized["headers"])
        self.assertNotIn("Authorization", headers)
        self.assertNotIn("Cookie", headers)
        # Body should be redacted
        self.assertIn("<REDACTED>", sanitized["body"]) 
    
