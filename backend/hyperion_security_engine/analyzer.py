"""security_engine.analyzer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Convenience façade that coordinates the various security detectors.  It
provides a single entry point :func:`analyze_events` that accepts a list of
``APIEvent`` instances and returns a list of serialisable alert dictionaries.

The implementation is intentionally simple: each detector is instantiated with
default parameters and invoked in turn.  Deduplication is performed on the
``alert_id`` value, keeping the most recent instance for each unique ID.
"""

from __future__ import annotations

from typing import List, Dict

from .event import APIEvent
from .detector_interfaces import SecurityAlert
from .scraping_detector import ScrapingDetector
from .token_misuse_detector import TokenMisuseDetector
from .bola_detector import BOLADetector

__all__ = ["analyze_events"]

def analyze_events(events: List[APIEvent]) -> List[Dict[str, object]]:
    """Run all detectors on *events* and return serialisable alerts.

    The function is deliberately agnostic to the detection thresholds; if
    callers need finer control they can instantiate detectors directly.
    """
    detectors: List[SecurityAlert] = []
    detector_instances = [
        ScrapingDetector(),
        TokenMisuseDetector(),
        BOLADetector(),
    ]
    alerts: List[SecurityAlert] = []
    for det in detector_instances:
        alerts.extend(det.detect(events))
    # Deduplicate on alert_id – keep the latest instance per id.
    unique: Dict[str, SecurityAlert] = {}
    for alert in alerts:
        unique[alert.alert_id] = alert
    return [a.to_dict() for a in unique.values()]
