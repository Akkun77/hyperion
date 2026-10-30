"""Fixed local HTTP reverse proxy and administrator-only policy controls."""
import time
import uuid
import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from .policy import METHODS, classify, gateway_path, parameter_mismatch, synthetic_identity
from .state import ControlInput, require_admin, state
from traffic_ingest import record_gateway

UPSTREAM = "http://127.0.0.1:8001"
MAX_REQUEST = 64 * 1024
MAX_RESPONSE = 256 * 1024
MAX_QUERY = 2048
REQUEST_HEADERS = ("accept", "accept-language", "content-type", "authorization", "user-agent")
RESPONSE_HEADERS = ("content-type", "cache-control")
router = APIRouter()


def install_gateway(app, normalize, analyze, service_domain):
    @router.get("/api/governance/gateway")
    def status(request: Request):
        require_admin(request)
        return state.snapshot()

    @router.post("/api/governance/gateway")
    def configure(payload: ControlInput, request: Request):
        require_admin(request)
        return state.update(payload)

    @router.api_route("/gateway", methods=METHODS)
    @router.api_route("/gateway/{path:path}", methods=METHODS)
    async def forward(request: Request):
        started = time.perf_counter()
        request_id = uuid.uuid4().hex
        method = request.method.upper()
        peer = request.client.host if request.client else "unknown"
        path = gateway_path(request)
        normalized = normalize(path) if path is not None else "/invalid-path"
        known = path is not None and classify(method, normalized)
        config = state.snapshot()
        decision, reason, status_code = "ALLOW", "ALLOWLISTED", None
        upstream_status = None
        response_body = b""
        response_headers = {}
        response_size = 0
        request_size = 0
        body = b""
        auth = request.headers.get("authorization", "")
        identity = synthetic_identity(auth)
        tampered = False
        owner = None
        permission = None
        target_id = None
        query = request.scope.get("query_string", b"")
        query_safe = len(query) <= MAX_QUERY and all(32 <= char <= 126 and char != 35 for char in query)
        if path is None or not query_safe:
            decision, reason, status_code = "BLOCK", "INVALID_PATH", 403
        elif config["enabled"] and state.rate_exceeded(peer):
            decision, reason, status_code = "BLOCK", "RATE_LIMIT", 429
        elif config["enabled"] and not known and config["shadow_policy"] == "BLOCK":
            decision, reason, status_code = "BLOCK", "SHADOW_ROUTE", 403
        elif config["enabled"] and not known:
            decision, reason = "FLAG", "SHADOW_ROUTE"
        elif not config["enabled"]:
            reason = "BYPASSED"

        if status_code is None:
            try:
                declared = request.headers.get("content-length")
                if declared and int(declared) > MAX_REQUEST:
                    raise ValueError("too large")
                chunks = []
                async for chunk in request.stream():
                    request_size += len(chunk)
                    if request_size > MAX_REQUEST:
                        raise ValueError("too large")
                    chunks.append(chunk)
                body = b"".join(chunks)
            except (ValueError, OverflowError):
                decision, reason, status_code = "BLOCK", "REQUEST_TOO_LARGE", 413

        if status_code is None:
            tampered = parameter_mismatch(method, normalized, body, identity)
            if tampered and config["enabled"]:
                decision, reason = "FLAG", "PARAMETER_MISMATCH"
            url = UPSTREAM + path
            if query:
                url += "?" + query.decode("ascii")
            headers = {name: request.headers[name] for name in REQUEST_HEADERS if name in request.headers}
            headers["x-hyperion-request-id"] = request_id
            try:
                transport = getattr(app.state, "gateway_transport", None)
                timeout = httpx.Timeout(5.0, connect=1.0, read=3.0)
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=False,
                                              trust_env=False, transport=transport) as client:
                    async with client.stream(method, url, headers=headers, content=body) as upstream:
                        upstream_status = upstream.status_code
                        status_code = upstream_status
                        owner = upstream.headers.get("x-demo-owner")
                        permission = upstream.headers.get("x-demo-permission")
                        response_headers = {name: upstream.headers[name] for name in RESPONSE_HEADERS if name in upstream.headers}
                        chunks = []
                        async for chunk in upstream.aiter_bytes():
                            response_size += len(chunk)
                            if response_size > MAX_RESPONSE:
                                raise ValueError("upstream response too large")
                            chunks.append(chunk)
                        response_body = b"".join(chunks)
                if permission == "deny" and 200 <= status_code < 300 and config["enabled"]:
                    decision, reason = "FLAG", "SYNTHETIC_BOLA_POLICY_VIOLATION"
            except httpx.TimeoutException:
                status_code, reason, response_body = 504, "UPSTREAM_TIMEOUT", b'{"detail":"Synthetic upstream timed out"}'
                response_headers = {"content-type": "application/json"}
            except httpx.RequestError:
                status_code, reason, response_body = 502, "UPSTREAM_UNAVAILABLE", b'{"detail":"Synthetic upstream unavailable"}'
                response_headers = {"content-type": "application/json"}
            except ValueError:
                status_code, reason, response_body = 502, "UPSTREAM_RESPONSE_TOO_LARGE", b'{"detail":"Upstream response exceeded limit"}'
                response_headers = {"content-type": "application/json"}
                response_size = len(response_body)
        if status_code in (403, 413, 429) and decision == "BLOCK":
            response_body = ('{"detail":"' + reason + '"}').encode()
            response_headers = {"content-type": "application/json"}
            response_size = len(response_body)
        if response_body and not response_size:
            response_size = len(response_body)
        if normalized.startswith("/api/v1/users/"):
            target_id = path.split("/")[4] if path and len(path.split("/")) > 4 else None
        elif normalized.startswith("/api/v1/accounts/"):
            target_id = path.split("/")[4] if path and len(path.split("/")) > 4 else None
        if not owner and target_id:
            owner = "user_" + target_id.split("_")[-1] if target_id.startswith("account_") else target_id
        service = service_domain(normalized)["id"]
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        evidence_id, findings = record_gateway(
            request_id=request_id, method=method, endpoint=normalized, client=peer,
            status_code=status_code, upstream_status=upstream_status, decision=decision,
            reason=reason, latency_ms=latency_ms, request_size=request_size,
            response_size=response_size, known=known,
            auth_type="Bearer Token" if auth.startswith("Bearer ") else "None",
            user_id=identity, token=auth[7:] if identity else None,
            target_id=target_id, owner=owner, permission=permission,
            tampered=tampered, service_id=service, analyze=analyze)
        response_headers.update({"x-hyperion-request-id": request_id,
                                 "x-hyperion-decision": decision,
                                 "x-hyperion-evidence-id": str(evidence_id)})
        return Response(content=b"" if method == "HEAD" else response_body,
                        status_code=status_code, headers=response_headers)

    app.include_router(router)
