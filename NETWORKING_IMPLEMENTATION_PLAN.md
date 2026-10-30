# HYPERION Networking Edition — implementation plan

Status: Phase 1 backend implemented in this independent copy. The gateway, policy controls, synthetic upstream, telemetry, findings, and focused tests are present. Gateway-specific frontend controls and display remain future work. All services use local HTTP on loopback; TLS termination is not configured.

## Existing functionality to reuse

- `backend/app.py` is the integrated FastAPI entry point. Its middleware observes in-process API requests, normalizes paths, compares method plus path with the documented catalog, writes traffic, triggers alerts, and updates endpoint risk. It currently records after the handler responds and does not proxy or block requests.
- `backend/openapi.json`, `backend/product_connections.py`, and `backend/database/models.py` provide the managed route catalog and Connect API registration. A registered external URL is metadata only, not live capture.
- `backend/hyperion_security_engine/` has BOLA, token misuse, and scraping detectors; `backend/engine/risk_scorer.py` provides explainable endpoint risk. BOLA needs trustworthy caller/owner/authorization context, and existing token signals are demonstration heuristics.
- `backend/database/db_client.py` and `backend/database/models.py` use local SQLite for traffic, inventory, alerts, and evidence IDs. `/api/risk-hierarchy` aggregates endpoint risk into service and platform views; `/api/execution-flow` and investigation pages link findings to traffic.
- `backend/product_demo.py`, `simulate.py`, and the built-in API routes supply synthetic controlled scenarios. The React/Vite dashboard under `frontend/src/` already has traffic, inventory, findings, risk hierarchy, Connect API, investigation, and demo views. It polls the backend.
- `backend/main.py` is a separate legacy LLM gateway and is not the integrated API-security startup path. The root `database/`, `Database_edit/`, `security_engine/`, and `contracts/` are retained source/legacy material, not the proposed gateway runtime.

## Local topology and request flow

- `127.0.0.1:5173`: existing Vite dashboard.
- `127.0.0.1:8000`: existing FastAPI control plane and new gateway route at `/gateway/{path:path}`.
- `127.0.0.1:8001`: new protected synthetic FastAPI test API, reachable directly only from the same machine for the classroom demonstration.
- Client sends `METHOD http://127.0.0.1:8000/gateway/api/...`. Gateway strips `/gateway`, checks the configured method/path allowlist and per-client rate window, then forwards method, path, query, body, and safe headers via `httpx.AsyncClient` to the fixed `http://127.0.0.1:8001` upstream. It relays upstream status, safe response headers, and body. No client-supplied upstream URL or external network destination is accepted.
- Decision: `BLOCK` returns a local 403 for disallowed routes/methods or a 429 for rate limits (and optionally for configured shadow blocking); `FLAG` forwards but records a finding; `ALLOW` forwards normally. Unknown routes are always marked shadow; configurable shadow policy decides flag versus block. When gateway enforcement is disabled, proxying continues and telemetry records an allow/bypassed state. The enable/disable control is local-only, with an explicit visible status and no effect on legacy demo endpoints.
- Persist one gateway traffic record for every attempt, including blocked requests and upstream errors, with request/response metadata, decision, reason, timing, and evidence correlation. Never store raw credentials, full sensitive bodies, or trust arbitrary `X-Forwarded-For`. Use the direct peer as client identity for the local demo. Run existing detectors on bounded synthetic context; score the endpoint, then derive service/platform risk from existing hierarchy logic. Use a stable synthetic token-to-user map and protected API owner/authorization metadata for demonstrable BOLA and parameter mismatch signals; do not claim real authentication enforcement.

## Minimum viable implementation and exact files expected to change

New files:
- `backend/gateway/__init__.py`, `backend/gateway/proxy.py`: fixed-upstream HTTP reverse proxy, bounded request/response handling, timeout/error response, header filtering.
- `backend/gateway/policy.py`: route/method allowlist, shadow mode, per-client rate limiting, ALLOW/FLAG/BLOCK decision and reason.
- `backend/gateway/state.py`: local enable/disable and shadow policy configuration, local-only control endpoints.
- `backend/traffic_ingest.py`: shared persistence, detector invocation, evidence linking, and endpoint risk update extracted from current middleware to avoid duplicate gateway records.
- `backend/protected_api.py`: deterministic synthetic users, balances, payments, and owner/permission metadata for offline demonstrations.

Existing files expected to change:
- `backend/app.py`: mount gateway/control routes, bypass the legacy middleware for `/gateway`, and invoke shared ingestion for its existing demo traffic.
- `backend/database/models.py`, `backend/database/db_client.py`: additive gateway metadata/decision fields and safe SQLite migration; keep evidence IDs usable for blocked attempts.
- `backend/engine/risk_scorer.py`: explainable factors for gateway block/flag observations if needed; preserve the present endpoint/service/platform hierarchy semantics.
- `backend/product_connections.py`: reuse registered method/path catalog for the protected local API; report active gateway capture accurately.
- `backend/product_traffic.py`: expose decision and correlation metadata in existing traffic/findings queries.
- `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/workspace/productApi.ts`, `frontend/src/workspace/ConnectAPI.tsx`, `frontend/src/pages/CommandCenter.tsx`, `frontend/src/pages/Investigation.tsx` (and associated existing workspace components/styles only where needed): show gateway status, control, request decisions, and evidence without a redesign.
- `README.md`, `requirements.txt`, `frontend/.env.example`: document the three local processes, routes, settings, and demo; existing `httpx` is already declared.

## Features planned to function

Local HTTP reverse proxy; exact method/normalized-route allowlisting; shadow observation and optional blocking; per-client rate limiting; request/response status, size, latency, route, and decision telemetry; synthetic-context BOLA, token misuse, and parameter-tampering findings; ALLOW/FLAG/BLOCK; endpoint risk and current service/platform rollups; evidence-linked investigation; local gateway toggle; dashboard polling. Existing in-process demo, Connect API registration, inventory, findings, risk views, and presentation styling remain available.

## Minimal offline professor demonstration

Start the synthetic API on 8001, integrated backend on 8000, and Vite on 5173 with a fresh local SQLite path under `.local/`. Register the protected test API catalog. Send a normal request through `/gateway/api/v1/users/1` and show ALLOW plus upstream response. Send an unknown route to show shadow FLAG, then enable shadow blocking and repeat for BLOCK. Exceed the per-client limit to show 429. Send a synthetic cross-owner request, reused token, and changed account parameter to show contextual findings. Open the dashboard traffic row, finding, evidence record, and updated hierarchy. Toggle gateway enforcement off/on and show the changed decision behavior. All data are synthetic; no internet is required.

## Technical risks

The present middleware analyzes only after handlers respond, so blocking requires a distinct pre-forward policy path and shared ingestion to prevent duplicates. Route normalization and allowlist matching must agree, including method, encoded path, trailing slash, and query. SQLite migrations must preserve existing evidence links and handle concurrent writes. The current client IP and user headers are spoofable, and demo tokens do not prove identity; the networking edition must use direct peer identity and explicit synthetic ownership context. Proxy limits, timeouts, hop-by-hop header stripping, and fixed upstream validation are required. The protected API is loopback-only for the demo and can be reached directly on the host; this is not a hardened production security boundary. TLS termination is not configured.