"""Local gateway policy state and rate window."""
import os
import secrets
import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict


def _bounded_int(name, default, minimum, maximum):
    try:
        return max(minimum, min(maximum, int(os.getenv(name, str(default)))))
    except ValueError:
        return default


class ControlInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool | None = None
    shadow_policy: str | None = None


class GatewayState:
    def __init__(self):
        self.enabled = True
        self.shadow_policy = "FLAG"
        self.rate_limit = _bounded_int("HYPERION_GATEWAY_RATE_LIMIT", 10, 1, 1000)
        self.rate_window_seconds = _bounded_int("HYPERION_GATEWAY_RATE_WINDOW", 10, 1, 3600)
        self._hits = defaultdict(deque)
        self._lock = Lock()

    def snapshot(self):
        with self._lock:
            return {"enabled": self.enabled, "shadow_policy": self.shadow_policy,
                    "rate_limit": self.rate_limit, "rate_window_seconds": self.rate_window_seconds,
                    "upstream": "http://127.0.0.1:8001"}

    def update(self, payload):
        if payload.shadow_policy is not None and payload.shadow_policy not in ("FLAG", "BLOCK"):
            raise HTTPException(422, "shadow_policy must be FLAG or BLOCK")
        with self._lock:
            if payload.enabled is not None:
                self.enabled = payload.enabled
                self._hits.clear()
            if payload.shadow_policy is not None:
                self.shadow_policy = payload.shadow_policy
        return self.snapshot()

    def rate_exceeded(self, client):
        now = time.monotonic()
        with self._lock:
            hits = self._hits[client]
            while hits and now - hits[0] >= self.rate_window_seconds:
                hits.popleft()
            if len(hits) >= self.rate_limit:
                return True
            hits.append(now)
            return False


state = GatewayState()


def require_admin(request):
    peer = request.client.host if request.client else None
    if peer not in ("127.0.0.1", "::1", "testclient"):
        raise HTTPException(403, "Gateway controls require a loopback client")
    origin = request.headers.get("origin")
    if origin and origin not in ("http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:8000", "http://localhost:8000"):
        raise HTTPException(403, "Untrusted control origin")
    secret = os.getenv("HYPERION_GATEWAY_ADMIN_SECRET", "")
    if not secret:
        raise HTTPException(503, "Set HYPERION_GATEWAY_ADMIN_SECRET before using gateway controls")
    supplied = request.headers.get("x-gateway-admin-secret", "")
    if not secrets.compare_digest(supplied, secret):
        raise HTTPException(403, "Invalid gateway administrator secret")
