# security_engine/token_misuse_detector.py
"""
Detector for token misuse (e.g., token sharing, stolen tokens).
Detects the same token used from multiple distinct locations.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple
from collections import defaultdict
from .detector_interfaces import DetectorInterface, SecurityAlert
from .event import APIEvent
import datetime
import hashlib


class TokenMisuseDetector(DetectorInterface):
    """Detects token misuse based on concurrent usage from multiple IPs."""
    
    def __init__(
        self,
        time_window_seconds: int = 300,  # 5 minutes
        ip_threshold: int = 3,  # Number of distinct IPs considered suspicious
        hash_function: str = "sha256",  # Hash function for token fingerprinting
        alert_cool_down_seconds: int = 300,   # 5 minutes cool-down between alerts for same token
    ):
        """
        Initialize the token misuse detector.
        
        Args:
            time_window_seconds: Size of the sliding time window in seconds (default: 300).
            ip_threshold: Maximum allowed distinct IPs per API key in the time window (default: 3).
            hash_function: Hash function to use for token fingerprinting (default: "sha256").
            alert_cool_down_seconds: Cool-down period in seconds after an alert before another can be triggered for the same token (default: 300).
        """
        self.time_window_seconds = time_window_seconds
        self.ip_threshold = ip_threshold
        self.hash_function = hash_function
        self.alert_cool_down_seconds = alert_cool_down_seconds
        # In-memory storage for (timestamp, source_ip) per token hash
        self.token_usage: defaultdict[str, List[Tuple[datetime.datetime, Optional[str]]]] = defaultdict(list)
        # Track last alert time per token hash for cool-down
        self.last_alert_time: dict[str, float] = {}
    
    def _hash_token(self, token: str) -> str:
        """Hash a token using the specified hash function."""
        if self.hash_function == "sha256":
            return hashlib.sha256(token.encode()).hexdigest()
        else:
            # Fallback to sha256
            return hashlib.sha256(token.encode()).hexdigest()
    
    def detect(self, events: List[APIEvent]) -> List[SecurityAlert]:
        """Detect token misuse events in the given list of events."""
        alerts: List[SecurityAlert] = []
        now = datetime.datetime.now(datetime.timezone.utc)
        now_timestamp = now.timestamp()
        incoming_token_hashes = {
            self._hash_token(event.api_key) for event in events
            if event.api_key is not None
        }
        
        # Add new events to the tracking structure
        for event in events:
            # Convert ISO timestamp to datetime object (assumes UTC 'Z' suffix)
            event_time = datetime.datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
            api_key = event.api_key
            source_ip = event.source_ip
            if api_key is not None:
                token_hash = self._hash_token(api_key)
                self.token_usage[token_hash].append((event_time, source_ip))
        
        # Check each token hash for misuse
        for token_hash in list(self.token_usage.keys()):
            # Remove usage records outside the time window
            cutoff = now - datetime.timedelta(seconds=self.time_window_seconds)
            recent_usage = [(ts, ip) for ts, ip in self.token_usage[token_hash] if ts >= cutoff]
            # Update the stored usage to only keep recent ones
            self.token_usage[token_hash] = recent_usage
            
            if not recent_usage:
                # No recent usage, we can remove the token to save memory
                del self.token_usage[token_hash]
                if token_hash in self.last_alert_time:
                    del self.last_alert_time[token_hash]
                continue
            
            # Expire all state, but only attribute findings to a token in this
            # batch. An unrelated request is not evidence of an old replay.
            if token_hash not in incoming_token_hashes:
                continue

            # Extract distinct source IPs from recent usage (ignore None IPs)
            distinct_ips: Set[Optional[str]] = set(ip for _, ip in recent_usage if ip is not None)
            distinct_ip_count = len(distinct_ips)
            
            # Determine if we should trigger an alert
            alert_triggered = False
            severity = "medium"
            description = ""
            detection_method = "ip_diversity_analysis"
            
            if distinct_ip_count > self.ip_threshold:
                alert_triggered = True
                severity = "medium"
                description = f"Token hash {token_hash[:8]}... used from {distinct_ip_count} distinct IP addresses in {self.time_window_seconds} seconds, exceeding threshold of {self.ip_threshold}."
            # else: no alert
            
            if alert_triggered:
                # Apply cool-down
                last_alert = self.last_alert_time.get(token_hash, 0)
                if now_timestamp - last_alert < self.alert_cool_down_seconds:
                    # Skip alert due to cool-down
                    continue
                
                # Update last alert time
                self.last_alert_time[token_hash] = now_timestamp
                
                # Generate alert ID
                alert_id = f"token_misuse_{token_hash}_{int(now_timestamp)}"
                
                # Prepare evidence (we can show first few chars of each IP for privacy)
                evidence_ips = []
                for ip in distinct_ips:
                    if ip is None:
                        evidence_ips.append("None")
                    else:
                        # Show first 3 chars and last 3 chars, or mask
                        if len(ip) > 6:
                            evidence_ips.append(f"{ip[:3]}***{ip[-3:]}")
                        else:
                            evidence_ips.append(ip)
                
                evidence = {
                    "token_hash_prefix": token_hash[:8],
                    "distinct_ip_count": distinct_ip_count,
                    "distinct_ips_sample": evidence_ips[:5],  # Show up to 5 examples
                    "time_window_seconds": self.time_window_seconds,
                }
                
                alert = SecurityAlert(
                    alert_id=alert_id,
                    alert_type="token_misuse",
                    severity=severity,
                    description=description,
                    detection_method=detection_method,
                    timestamp=now.isoformat(),
                    related_event_ids=[],  # We don\'t store event IDs in this simple implementation
                    recommended_action=f"Consider investigating token usage. Evidence: {evidence}.",
                    confidence=0.7,  # Moderate confidence for suspicion
                )
                alerts.append(alert)
        
        return alerts

    @property
    def detector_name(self) -> str:
        return "Token Misuse Detector"

    @property
    def alert_type(self) -> str:
        return "token_replay"
