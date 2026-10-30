"""Fixed, loopback-only demonstrations through the actual gateway proxy."""
import asyncio
import uuid
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from database import db_client
from database.models import SecurityAlertDB
from product_connections import require_local_control
from product_traffic import traffic_record
from .state import state


class DemoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: Literal["legitimate", "shadow", "rate", "bola", "tamper"]
    authorized: bool = False


DESCRIPTIONS = {
    "legitimate": "An allowlisted request reaches the protected synthetic API.",
    "shadow": "An unknown route is forwarded and flagged, or blocked, under the current shadow policy.",
    "rate": "Requests from one isolated loopback peer exceed the configured rolling limit.",
    "bola": "The synthetic API returns another user's record; the gateway flags the policy violation and links a finding.",
    "tamper": "A payment tries another user's source account; the gateway flags it and the upstream rejects it.",
}


def install_gateway_demo(app):
    router = APIRouter(prefix="/api/governance/gateway-demo", tags=["Local gateway demonstration"])
    lock = asyncio.Lock()

    @router.post("/run")
    async def run(payload: DemoInput, request: Request):
        require_local_control(request)
        if not payload.authorized:
            raise HTTPException(403, "Confirm authorization to append local synthetic gateway requests.")
        if lock.locked():
            raise HTTPException(409, "Another gateway demonstration is running.")
        async with lock:
            config = state.snapshot()
            if not config["enabled"]:
                raise HTTPException(409, "Enable gateway policy before running these scenarios.")
            if payload.scenario == "rate" and config["rate_limit"] > 30:
                raise HTTPException(409, "Configured rate limit exceeds the bounded demonstration maximum of 30.")

            # One random loopback peer per run isolates the rate window without resetting it.
            seed = uuid.uuid4().bytes
            peer = f"127.{seed[0] or 1}.{seed[1]}.{seed[2] or 1}"
            transport = httpx.ASGITransport(app=app, client=(peer, 50000))
            steps = config["rate_limit"] + 1 if payload.scenario == "rate" else 1
            path = {
                "legitimate": "/gateway/api/v1/users/user_101",
                "shadow": "/gateway/api/v2/debug",
                "rate": "/gateway/health",
                "bola": "/gateway/api/v1/users/user_202",
                "tamper": "/gateway/api/v1/payments",
            }[payload.scenario]
            headers = {"Authorization": "Bearer demo-user-101"} if payload.scenario in ("legitimate", "bola", "tamper") else {}
            results = []
            async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:8000") as client:
                for _ in range(steps):
                    if payload.scenario == "tamper":
                        response = await client.post(path, headers=headers, json={
                            "from_account_id": "account_202", "to_account_id": "account_101", "amount": 10,
                        })
                    else:
                        response = await client.get(path, headers=headers)
                    evidence_id = response.headers.get("x-hyperion-evidence-id")
                    if not evidence_id or not evidence_id.isdigit():
                        raise HTTPException(500, "Gateway response had no persisted evidence ID.")
                    results.append((response, int(evidence_id)))

            response, evidence_id = results[-1]
            with db_client.SessionLocal() as db:
                from database.models import TrafficLogDB
                row = db.get(TrafficLogDB, evidence_id)
                if row is None:
                    raise HTTPException(500, "Gateway evidence was not persisted.")
                event = traffic_record(row)
                findings = [
                    {"alert_id": str(alert.id), "type": alert.alert_type, "severity": alert.severity}
                    for alert in db.query(SecurityAlertDB).filter(SecurityAlertDB.related_event_id == evidence_id).all()
                ]
            expected = {
                "legitimate": (200, "ALLOW", "ALLOWLISTED"),
                "shadow": (403, "BLOCK", "SHADOW_ROUTE") if config["shadow_policy"] == "BLOCK" else (200, "FLAG", "SHADOW_ROUTE"),
                "rate": (429, "BLOCK", "RATE_LIMIT"),
                "bola": (200, "FLAG", "SYNTHETIC_BOLA_POLICY_VIOLATION"),
                "tamper": (403, "FLAG", "PARAMETER_MISMATCH"),
            }[payload.scenario]
            match = (event["status_code"], event["gateway_decision"], event["decision_reason"]) == expected
            linked = payload.scenario not in ("bola", "tamper") or any(
                item["type"].upper() == ("BOLA" if payload.scenario == "bola" else "PARAMETER_TAMPERING")
                for item in findings
            )
            forwarded = payload.scenario != "rate" or all(item[0].status_code == 200 for item in results[:-1])
            verified = match and linked and forwarded and event["source"] == "gateway" and response.status_code == event["status_code"]
            return {
                "scenario": payload.scenario,
                "concept": DESCRIPTIONS[payload.scenario],
                "verified": verified,
                "expected": {"http_status": expected[0], "decision": expected[1], "reason": expected[2]},
                "request_count": len(results),
                "event": event,
                "findings": findings,
                "message": "Returned response and persisted gateway evidence agree." if verified else "The observed result did not meet every scenario check; inspect the evidence.",
            }

    app.include_router(router)
