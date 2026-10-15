# security_engine/scraping_detector.py
"""
Detector for API scraping and data harvesting.
Detects high-frequency requests and broad endpoint enumeration from a single client.
"""

from __future__ import annotations
from collections import defaultdict
from typing import List, Optional, Tuple
from .detector_interfaces import DetectorInterface, SecurityAlert
from .event import APIEvent
import datetime


class ScrapingDetector(DetectorInterface):
    """Detects scraping based on request rate and endpoint diversity per client."""
    
    def __init__(
        self,
        time_window_seconds: int = 60,
        request_threshold_high: int = 100,   # requests per window for high confidence
        request_threshold_moderate: int = 50, # requests per window for moderate confidence
        endpoint_threshold: int = 10,         # distinct endpoints per window for suspicion
        ip_header: str = "source_ip",
        alert_cool_down_seconds: int = 300,   # 5 minutes cool-down between alerts for same client
    ):
        """
        Initialize the scraping detector.
        
        Args:
            time_window_seconds: Size of the sliding time window in seconds (default: 60).
            request_threshold_high: Request count threshold for high confidence alert (default: 100).
            request_threshold_moderate: Request count threshold for moderate confidence (default: 50).
            endpoint_threshold: Distinct endpoint count threshold for suspicion (default: 10).
            ip_header: Field to use for client identification (\'source_ip\' or \'user_id\').
            alert_cool_down_seconds: Cool-down period in seconds after an alert before another can be triggered for the same client (default: 300).
        """
        self.time_window_seconds = time_window_seconds
        self.request_threshold_high = request_threshold_high
        self.request_threshold_moderate = request_threshold_moderate
        self.endpoint_threshold = endpoint_threshold
        self.ip_header = ip_header
        self.alert_cool_down_seconds = alert_cool_down_seconds
        # In-memory storage for (timestamp, path) per client
        self.client_events: defaultdict[str, List[Tuple[datetime.datetime, str]]] = defaultdict(list)
        # Track last alert time per client for cool-down
        self.last_alert_time: dict[str, float] = {}
    
    def detect(self, events: List[APIEvent]) -> List[SecurityAlert]:
        """Detect scraping events in the given list of events."""
        alerts: List[SecurityAlert] = []
        now = datetime.datetime.now(datetime.timezone.utc)
        now_timestamp = now.timestamp()
        
        # Add new events to the tracking structure
        for event in events:
            event_time = datetime.datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
            client_id = getattr(event, self.ip_header)
            if client_id is not None:
                self.client_events[client_id].append((event_time, event.path))
        
        # Check each client for scraping behavior
        for client_id in list(self.client_events.keys()):
            # Remove events outside the time window
            cutoff = now - datetime.timedelta(seconds=self.time_window_seconds)
            recent_events = [ (ts, path) for ts, path in self.client_events[client_id] if ts >= cutoff ]
            # Update the stored events to only keep recent ones
            self.client_events[client_id] = recent_events
            
            if not recent_events:
                # No recent events, we can remove the client to save memory
                del self.client_events[client_id]
                if client_id in self.last_alert_time:
                    del self.last_alert_time[client_id]
                continue
            
            # Calculate metrics
            request_count = len(recent_events)
            distinct_endpoints = len(set(path for _, path in recent_events))
            
            # Determine if we should trigger an alert
            alert_triggered = False
            severity = "medium"
            description = ""
            detection_method = "rate_and_endpoint_analysis"
            
            if request_count > self.request_threshold_high:
                alert_triggered = True
                severity = "high"
                description = f"Client {client_id} made {request_count} requests in {self.time_window_seconds} seconds, exceeding high threshold of {self.request_threshold_high}."
            elif request_count > self.request_threshold_moderate and distinct_endpoints > self.endpoint_threshold:
                alert_triggered = True
                severity = "medium"
                description = f"Client {client_id} made {request_count} requests (>{self.request_threshold_moderate}) and accessed {distinct_endpoints} distinct endpoints (>{self.endpoint_threshold}) in {self.time_window_seconds} seconds."
            # else: no alert
            
            if alert_triggered:
                # Apply cool-down
                last_alert = self.last_alert_time.get(client_id, 0)
                if now_timestamp - last_alert < self.alert_cool_down_seconds:
                    # Skip alert due to cool-down
                    continue
                
                # Update last alert time
                self.last_alert_time[client_id] = now_timestamp
                
                # Generate alert ID
                alert_id = f"scraping_{client_id}_{int(now_timestamp)}"
                
                # Prepare evidence
                evidence = {
                    "request_count": request_count,
                    "distinct_endpoint_count": distinct_endpoints,
                    "time_window_seconds": self.time_window_seconds,
                }
                
                alert = SecurityAlert(
                    alert_id=alert_id,
                    alert_type="scraping",
                    severity=severity,
                    description=description,
                    detection_method=detection_method,
                    timestamp=now.isoformat(),
                    related_event_ids=[],  # We don\'t store event IDs in this simple implementation
                    recommended_action=f"Consider rate limiting or investigating client {client_id}. Evidence: {evidence}.",
                    confidence=0.8 if severity == "medium" else 0.9,
                )
                alerts.append(alert)
        
        return alerts

    @property
    def detector_name(self) -> str:
        return "Scraping Detector"

    @property
    def alert_type(self) -> str:
        return "scraping"
