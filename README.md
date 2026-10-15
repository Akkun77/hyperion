# HYPERION

API discovery, runtime security detection and evidence-driven investigation for CyberCup 6.0 CC6-IC07.

This repository contains the integrated cinematic React frontend and FastAPI API-security platform. The original Hyperion contribution history and useful legacy modules are retained. The integrated entry point is **backend/app.py**, not the older LLM gateway in backend/main.py.

## Run locally on Windows

Use Python 3.10+ and Node.js with npm. From this repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm --prefix frontend ci
```

In separate terminals, with the virtual environment activated for Python:

```powershell
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173/ and enter the command center. The frontend polls the backend every five seconds; this is not a streaming implementation. No backend subscription is mounted on the marketing pages.

If the original application is already running, use separate ports and an isolated database as described in [MIGRATION.md](docs/MIGRATION.md). Frontend API base is configurable through VITE_API_BASE.

## Capabilities

- Cinematic emerald WebGL landing, reduced-motion support and lightweight fallback.
- Traffic-based inventory and two controlled shadow endpoints: GET /api/v2/debug and GET /api/v1/admin/export.
- Scraping, token-misuse and BOLA findings, explainable 0–100 risk scores.
- Persisted alerts and clickable traffic evidence in the routed command center.
- An append-only controlled simulator available in the overview, or through python simulate.py.

The demonstration target APIs intentionally allow unsafe behavior to exercise the detectors. Identity and forwarded-IP headers are demo signals, not trusted production authentication. Sensitive-data indicators are heuristic. This is a local hackathon platform, not a production security boundary. Keep it bound to loopback; do not expose simulation, reset, debug or export routes publicly.

## Fresh database and private restore

Starting backend/app.py creates the SQLite schema if needed and adds the nullable alert evidence column to older databases without dropping records. The default file is backend/database/api_security.db and is ignored by Git.

HYPERION_DATABASE_PATH selects an alternative local file. HYPERION_BASE_URL selects the simulator target (default http://127.0.0.1:8000). Never run the legacy seeder or reset endpoint against an important database. Existing historical databases are private local backups, not part of this repository. Follow [MIGRATION.md](docs/MIGRATION.md) for backup and restore instructions.

## Verification

Install the API test client with `python -m pip install -r requirements-dev.txt` before running the tests.

```powershell
python -m unittest discover -s backend/hyperion_security_engine/tests -t backend -v
python -m unittest discover -s tests -v
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
python verify_demo.py
```

verify_demo.py requires a running backend and frontend. It takes a SQLite backup before appending demonstration traffic and validates evidence, risk explanations and preservation of old traffic/alerts. Set HYPERION_FRONTEND_URL if the frontend is on another port.

For a production-bundle local preview:

```powershell
npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

## Repository layout

- frontend/: integrated React/TypeScript/Vite experience and WebGL lifecycle tests.
- backend/app.py: integrated FastAPI entry point; backend/database/: models and additive migration.
- backend/hyperion_security_engine/ and backend/engine/: runtime detection and explainable scoring.
- simulate.py, verify_demo.py, tests/: controlled scenarios and integration checks.
- docs/: design handoff, provenance and migration/restore procedures.
- backend/main.py, Database_edit/, database/ and security_engine/: retained original Hyperion material. Their older documentation/dependency manifests describe a separate LLM gateway and are not the installation instructions for the integrated application.

See [PROVENANCE.md](docs/PROVENANCE.md) for source continuity. A historical demo database and bytecode were present in the personal repository before migration; they are removed from the new branch's tracked tree without deleting local copies or rewriting history.
