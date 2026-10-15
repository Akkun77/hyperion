# security_engine/bola_detector.py
"""
Detector for Broken Object Level Authorization (BOLA).
Detects authorization bypass where a denied request still succeeds.
"""

from __future__ import annotations
from typing import List, Optional, Tuple, Set
from collections import defaultdict
from .detector_interfaces import DetectorInterface, SecurityAlert
from .event import APIEvent
import datetime
import hashlib


class BOLADetector(DetectorInterface):
    """Detects BOLA based on explicit authorization denial with successful response."""
    
    def __init__(
        self,
        time_window_seconds: int = 300,  # 5 minutes
        attempt_threshold: int = 5,      # Number of denied attempts to consider suspicious
        alert_cool_down_seconds: int = 300,   # 5 minutes cool-down between alerts for same resource/user
    ):
        """
        Initialize the BOLA detector.
        
        Args:
            time_window_seconds: Size of the sliding time window in seconds (default: 300).
            attempt_threshold: Number of denied attempts (403) to consider as suspicious pattern (default: 5).
            alert_cool_down_seconds: Cool-down period in seconds after an alert before another can be triggered for the same key (default: 300).
        """
        self.time_window_seconds = time_window_seconds
        self.attempt_threshold = attempt_threshold
        self.alert_cool_down_seconds = alert_cool_down_seconds
        # In-memory storage for denied attempts per (resource_owner, user_id) or per resource
        # We will store per resource path and user_id (or resource_owner if available)
        self.denied_attempts: defaultdict[str, List[Tuple[datetime.datetime, Optional[str], Optional[str]]]] = defaultdict(list)
        # Track last alert time per key for cool-down
        self.last_alert_time: dict[str, float] = {}
    
    def _make_key(self, resource_path: str, user_id: Optional[str], resource_owner: Optional[str]) -> str:
        """Create a key for grouping denied attempts."""
        # We can use resource_path and user_id (or resource_owner) to group.
        # For simplicity, we will use resource_path and user_id (if available) else resource_owner.
        # If both are missing, we can use resource_path alone.
        if user_id is not None:
            key = f"{resource_path}:{user_id}"
        elif resource_owner is not None:
            key = f"{resource_path}:{resource_owner}"
        else:
            key = resource_path
        return key
    
    def detect(self, events: List[APIEvent]) -> List[SecurityAlert]:
        """Detect BOLA events in the given list of events."""
        alerts: List[SecurityAlert] = []
        now = datetime.datetime.now(datetime.timezone.utc)
        now_timestamp = now.timestamp()
        incoming_keys = {
            self._make_key(event.path, str(event.user_id) if event.user_id is not None else None,
                           event.resource_owner)
            for event in events
        }
        
        # Add new events to the tracking structure
        for event in events:
            event_time = datetime.datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
            resource_path = event.path
            user_id = str(event.user_id) if event.user_id is not None else None
            resource_owner = event.resource_owner
            status_code = event.status_code
            permission_decision = event.permission_decision
            
            # Track denied attempts (status_code 403 or explicit denial)
            is_denied = False
            if status_code == 403:
                is_denied = True
            elif permission_decision is not None and permission_decision.lower().strip() == "deny":
                is_denied = True
            
            if is_denied:
                key = self._make_key(resource_path, user_id, resource_owner)
                self.denied_attempts[key].append((event_time, user_id, resource_owner))
        
        # Check for confirmed BOLA: denial with success
        for event in events:
            if event.permission_decision is not None and event.status_code is not None:
                perm_decision = event.permission_decision.lower().strip()
                if perm_decision == "deny":
                    if 200 <= event.status_code < 300:
                        # This is a clear BOLA: denied by auth but succeeded
                        key = self._make_key(event.path, 
                                           str(event.user_id) if event.user_id is not None else None,
                                           event.resource_owner)
                        alert_id = f"bola_confirmed_{key}_{int(now_timestamp)}"
                        
                        # Apply cool-down
                        last_alert = self.last_alert_time.get(key, 0)
                        if now_timestamp - last_alert < self.alert_cool_down_seconds:
                            continue
                        self.last_alert_time[key] = now_timestamp
                        
                        evidence = {
                            "resource_path": event.path,
                            "user_id": event.user_id,
                            "resource_owner": event.resource_owner,
                            "permission_decision": event.permission_decision,
                            "status_code": event.status_code,
                        }
                        
                        alert = SecurityAlert(
                            alert_id=alert_id,
                            alert_type="bola",
                            severity="critical",
                            description=f"Authorization system denied access (decision: \"{event.permission_decision}\") but request succeeded with status {event.status_code}.",
                            detection_method="authorization_bypass_analysis",
                            timestamp=event.timestamp,
                            related_event_ids=[event.event_id],
                            recommended_action=f"Investigate the authorization check for endpoint {event.path}. Ensure that denial decisions are enforced.",
                            confidence=0.95,
                        )
                        alerts.append(alert)
        
        # Check for suspicious patterns: multiple denied attempts
        for key in list(self.denied_attempts.keys()):
            # Remove attempts outside the time window
            cutoff = now - datetime.timedelta(seconds=self.time_window_seconds)
            recent_attempts = [ (ts, uid, owner) for ts, uid, owner in self.denied_attempts[key] if ts >= cutoff ]
            # Update the stored attempts to only keep recent ones
            self.denied_attempts[key] = recent_attempts
            
            if not recent_attempts:
                # No recent attempts, we can remove the key to save memory
                del self.denied_attempts[key]
                if key in self.last_alert_time:
                    del self.last_alert_time[key]
                continue
            
            if key not in incoming_keys:
                continue

            attempt_count = len(recent_attempts)
            
            if attempt_count >= self.attempt_threshold:
                # Generate a suspicious BOLA alert (lower severity)
                alert_id = f"bola_suspicious_{key}_{int(now_timestamp)}"
                
                # Apply cool-down
                last_alert = self.last_alert_time.get(key, 0)
                if now_timestamp - last_alert < self.alert_cool_down_seconds:
                    continue
                self.last_alert_time[key] = now_timestamp
                
                # Prepare evidence (show limited info for privacy)
                sample_attempts = recent_attempts[:3]  # Show up to 3 examples
                evidence_attempts = []
                for ts, uid, owner in sample_attempts:
                    evidence_attempts.append({
                        "time": ts.isoformat(),
                        "user_id": uid,
                        "resource_owner": owner,
                    })
                
                evidence = {
                    "attempt_count": attempt_count,
                    "time_window_seconds": self.time_window_seconds,
                    "sample_attempts": evidence_attempts,
                }
                
                alert = SecurityAlert(
                    alert_id=alert_id,
                    alert_type="bola",  # We can keep the same alert type but maybe we should have a different type? We'll keep bola for now.
                    severity="medium",
                    description=f"Multiple denied access attempts ({attempt_count}) detected for key {key} in {self.time_window_seconds} seconds, suggesting potential BOLA probing.",
                    detection_method="repeated_denial_analysis",
                    timestamp=now.isoformat(),
                    related_event_ids=[],  # We don\'t store event IDs in this simple implementation
                    recommended_action=f"Investigate access patterns for resource {key}. Evidence: {evidence}.",
                    confidence=0.6,
                )
                alerts.append(alert)
        
        return alerts

    @property
    def detector_name(self) -> str:
        return "BOLA Detector"

    @property
    def alert_type(self) -> str:
        return "bola"
