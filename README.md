# HYPERION

### API Security. Beyond Visibility.

HYPERION is an API-security monitoring and investigation prototype built for **CyberCup 6.0 · CC6-IC07**. It connects observed requests to endpoint inventory, behavioral findings, explainable risk and persisted forensic evidence in one workspace.

![Hyperion homepage with its original animated emerald loop](docs/screenshots/homepage.webp)

*The cinematic product site leads into the operational command center and an explicitly authorized, controlled demonstration.*

## Core capabilities

- **Discovery and inventory:** normalize observed routes and compare them with the managed OpenAPI catalog.
- **Shadow API identification:** surface undocumented endpoints, including two intentionally provided local demonstration routes.
- **Request monitoring:** inspect persisted traffic, time ranges, response codes and server-side activity summaries.
- **Behavioral findings:** detect scraping bursts, token reuse across multiple IP origins and broken object-level authorization (BOLA) signals.
- **Explainable endpoint risk:** display persisted 0–100 scores with their actual contributing factors.
- **Hierarchical risk intelligence:** explore platform → service → endpoint → finding → request evidence.
- **Forensic investigation:** follow alert-to-request relationships, response status and recorded execution context.
- **Controlled demonstrations:** execute built-in scenarios once, then inspect the returned result with manual or optional automatic playback.
- **API onboarding:** register authorized routes manually or import an OpenAPI JSON catalog. Registration is not proof of captured external traffic.

## Architecture and technology

```text
Observed requests / controlled local scenarios
                    |
          FastAPI observation middleware
                    |
       route normalization + catalog comparison
                    |
       Python detection engine + risk scoring
                    |
         SQLite traffic, inventory and alerts
                    |
               JSON API endpoints
                    |
       React / TypeScript command center
            five-second polling
```

The frontend uses **React, TypeScript and Vite**, with Chart.js for traffic visualization. Its emerald visual environment is **native WebGL**; the integrated project does not depend on Three.js. Python/FastAPI connects the detection engine, explainable scoring and SQLite persistence. Backend-generated execution flows expose recorded evidence; they are not a streamed reconstruction of processing stages.

The integrated entry point is **`backend/app.py`**. The retained `backend/main.py` belongs to an older LLM gateway, not the API-security application described here. Root `requirements.txt` is the integrated runtime manifest; `backend/requirements.txt` describes optional legacy ML dependencies.

## Application gallery

All captures below are actual browser screenshots at a 1440-pixel desktop viewport. Operational captures use a separate, fresh SQLite database populated exclusively by built-in synthetic requests. No private historical telemetry or real credentials are included.

### Command center

![Overview with persisted request, endpoint and finding totals](docs/screenshots/overview.webp)

*Overview connects observed activity, shadow endpoints and security findings. Updates are polling-based, not WebSocket streaming.*

### API inventory

![Managed and shadow API inventory with recorded risk and activity](docs/screenshots/api-inventory.webp)

*Registered-only routes are distinguished from observed routes; shadow classification and actual endpoint risk remain visible.*

### Threat findings

![Security incident inbox with BOLA, token misuse and scraping findings](docs/screenshots/threat-findings.webp)

*The incident inbox provides detector/severity filters and an explicit evidence path.*

### Risk intelligence

![Explainable platform and service risk hierarchy](docs/screenshots/risk-intelligence.webp)

*Progressive hierarchy links platform exposure to the endpoint and finding that explain it.*

### Interactive demonstration

![Recorded BOLA walkthrough with manual playback controls](docs/screenshots/watch-hyperion-work.webp)

*A completed backend execution is presented as a recorded walkthrough. Replay does not execute another attack.*

Additional captures: [traffic activity](docs/screenshots/traffic-activity.webp), [execution flow](docs/screenshots/execution-flow.webp), and [investigation](docs/screenshots/investigation.webp). See [capture provenance](docs/screenshots/README.md).

## Installation

Required: **Python 3.10+**, **Node.js with npm**, and a modern browser. The release checks were run with Python 3.14.2, Node.js 24.14.1 and npm 11.11.0. Internet access is needed for the initial dependency installation; fonts have system fallbacks.

Clone the repository and choose this release branch:

```powershell
git clone --branch feature/iconic-security-core https://github.com/Akkun77/hyperion.git
cd hyperion
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm.cmd --prefix frontend ci
```

The development requirements include the runtime requirements and API test client. For a runtime-only installation, use root `requirements.txt`. Calling the virtual-environment executable directly avoids changing PowerShell execution policy. npm uses the included `frontend/package-lock.json`; Python dependencies currently specify minimum versions rather than a complete lock.

## Configuration and fresh database

| Variable | Purpose | Default |
| --- | --- | --- |
| `HYPERION_DATABASE_PATH` | SQLite file used by the integrated backend | `backend/database/api_security.db` |
| `VITE_API_BASE` | Backend origin used by the frontend | `http://localhost:8000` |
| `HYPERION_BASE_URL` | Target for the standalone simulator/verifier | `http://127.0.0.1:8000` |
| `HYPERION_FRONTEND_URL` | Frontend origin checked by `verify_demo.py` | `http://127.0.0.1:5173` |

`frontend/.env.example` contains a safe API-origin example, not credentials. You can copy it to your own ignored `frontend/.env.local`, or set VITE_API_BASE in the frontend terminal as below. Restart Vite after changing its configuration. The Python backend reads process environment variables; it does not automatically load a root `.env` file.

Starting `backend/app.py` creates the database directory and missing tables automatically. Its compatibility migration adds the nullable evidence-link column to older databases without dropping records. No existing traffic database is needed to reproduce the demo. To start another fresh dataset, choose a new, unused database filename instead of deleting or resetting existing records.

## Start the application

Run both commands from the repository root in **separate PowerShell terminals**.

Terminal 1 — FastAPI and a new local database:

```powershell
$env:HYPERION_DATABASE_PATH = Join-Path $PWD '.local\hyperion-demo.db'
.\.venv\Scripts\python.exe -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal 2 — React/Vite:

```powershell
$env:VITE_API_BASE = 'http://127.0.0.1:8000'
npm.cmd --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/**. The command center is at `/command-center`; the controlled demonstration is at `/watch`. Health is available at http://127.0.0.1:8000/api/health and interactive API documentation at http://127.0.0.1:8000/docs.

If ports are already occupied, choose unused ports and update VITE_API_BASE accordingly. Keep existing servers and their databases untouched. For backup/restore guidance see [MIGRATION.md](docs/MIGRATION.md). Private database files are ignored by Git.

## Run a controlled demonstration

1. Open `/watch`, select a scenario and confirm authorization.
2. Run the controlled scenario. The backend dispatches real requests through its own ASGI application and persists the results in your local database; no arbitrary remote target is contacted.
3. After the verified result returns, use **Previous / Play-Pause / Next / Replay**. Playback starts manually. Optional Play uses 10/10/10/12/12/12 seconds; the evidence stage remains open indefinitely. Manual selection cancels auto-advance; Pause preserves its remaining time.
4. Inspect the actual finding, backend risk explanation and investigation link. Replay reuses the returned result; only a new explicit execution appends another run.

Available scenarios: normal request, scraping, token misuse, BOLA and shadow discovery. Two built-in shadow targets are `GET /api/v2/debug` and `GET /api/v1/admin/export`. The shadow scenario exercises the first; the append-only simulator exercises both. Endpoint risk reflects accumulated state, so it is not a fixed score for every scenario or fresh database.

Optional command-line scenario against your own local demo backend:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/governance/demo/run' -ContentType 'application/json' -Body '{"scenario":"bola","authorized":true}'
```

For broader append-only traffic, use `.\.venv\Scripts\python.exe simulate.py`. Review its target first; HYPERION_BASE_URL overrides the default. Never aim the simulator at an unauthorized service.

**Connect API** can validate and register manual endpoints, an OpenAPI JSON specification or the built-in demo catalog. It does not fetch uploaded `$ref` URLs, install traffic collection in another service, or provide universal external API monitoring. A route can remain registered-only until supported local observations exist.

## Tests and production-bundle preview

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/hyperion_security_engine/tests -t backend -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend run build
```

Backend integration tests use their own temporary database. Frontend regressions cover polling cleanup/deduplication, filters, evidence links, reduced-motion behavior, manual playback/timer cancellation and backend-grounded risk display. The two existing six-test security-engine files are both retained.

The optional end-to-end verifier requires running frontend/backend servers and **appends controlled traffic**. It takes a SQLite backup first. Review its configuration before executing:

```powershell
$env:HYPERION_BASE_URL = 'http://127.0.0.1:8000'
$env:HYPERION_FRONTEND_URL = 'http://127.0.0.1:5173'
$env:HYPERION_DATABASE_PATH = Join-Path $PWD '.local\hyperion-demo.db'
.\.venv\Scripts\python.exe verify_demo.py
```

To preview the production bundle locally, set VITE_API_BASE **before building**, then run:

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Vite preview is a local preview, not a production deployment service. See [release verification](docs/RELEASE_VERIFICATION.md) and [browser playback audit instructions](frontend/tests/DEMO_TIMING.md) for the scope and limitations of executed checks.

## Repository layout

| Path | Role |
| --- | --- |
| `frontend/` | React/TypeScript workspace, native WebGL environment, public assets and frontend tests |
| `backend/app.py` | Integrated FastAPI entry point and observation middleware |
| `backend/product_*.py` | Controlled execution, catalog onboarding and traffic-query workflows |
| `backend/database/` | SQLAlchemy models, persistence and compatibility migration |
| `backend/hyperion_security_engine/` | Behavioral detectors and engine tests |
| `backend/engine/` | Explainable endpoint risk scoring |
| `tests/`, `simulate.py`, `verify_demo.py` | Integration tests and controlled verification tools |
| `docs/` | Architecture, design, screenshots, provenance and migration guidance |

`backend/main.py`, `Database_edit/`, root `database/`, root `security_engine/` and `contracts/` retain original project material. Some legacy detector/contract files are empty placeholders. The optional LLM/Ollama/Presidio/Transformers gateway is separate from the integrated startup path and is not claimed as an active or verified capability here. The rejected Sentinel Core geometry remains isolated development source, not production branding or a mounted application route.

## Limitations, security and authorization

- **Local prototype, not production-ready.** Bind to loopback only. The application is not a hardened, authenticated multi-user security service.
- Built-in targets intentionally allow unsafe behavior to demonstrate detection. User/forwarded-IP headers and synthetic credentials are demo signals, not trusted production authentication. The debug response contains a deliberately dummy development-secret string.
- Do not expose demo, reset, debug or export routes publicly. Detection is not a guarantee of attack prevention. Legacy seeding/reset/restore tools can overwrite data; never run them against an important database without understanding their effect and preserving a backup.
- Detection and sensitivity indicators use implemented rules/heuristics. There is no claim of machine-learning detection in this integrated engine, measured detection accuracy or universal coverage.
- Dashboard updates use five-second polling. Recorded demo stages are presentation, not per-stage backend streaming, SSE or WebSockets.
- Scores and findings depend on actual persisted observations and detector windows. Empty data and registered-only routes are valid initial states.
- Python dependencies are not fully pinned. Deprecation warnings in existing datetime fixtures and the current Starlette/httpx test-client compatibility path remain; they do not fail the release tests.
- Git excludes environment files, credentials, traffic databases, dependencies, build output, caches, logs and backups. A historical mock database and bytecode remain in earlier Git commits; removing files from the current tree does not erase history.

Use only systems and data you are authorized to assess. Keep private records out of screenshots and version control. See [PROVENANCE.md](docs/PROVENANCE.md) for source continuity, contributor publication authorization and historical-data context; no new open-source license is implied by this README.
