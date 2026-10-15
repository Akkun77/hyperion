# Local migration, isolated demo and database restore

The integrated application is at this repository root. No Sentinel .git directory or historical traffic database was copied into tracked source. Existing personal-repository history and useful original source files remain.

## Clean database

The default integrated database is backend/database/api_security.db. Starting backend/app.py creates missing tables. init_db() adds the nullable security_alerts.related_event_id column to older databases in place. Startup does not drop records or run a seeder. Calling it again is safe.

For an isolated local demo, create a directory outside Git and choose an unused database filename. Do not reuse the original application's database path.

PowerShell backend terminal (repository root):

```powershell
.\.venv\Scripts\Activate.ps1
$env:HYPERION_DATABASE_PATH = Join-Path $env:LOCALAPPDATA 'Hyperion\isolated-demo.db'
$env:HYPERION_BASE_URL = 'http://127.0.0.1:8011'
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8011
```

Frontend terminal:

```powershell
$env:VITE_API_BASE = 'http://127.0.0.1:8011'
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Verification terminal:

```powershell
.\.venv\Scripts\Activate.ps1
$env:HYPERION_DATABASE_PATH = Join-Path $env:LOCALAPPDATA 'Hyperion\isolated-demo.db'
$env:HYPERION_BASE_URL = 'http://127.0.0.1:8011'
$env:HYPERION_FRONTEND_URL = 'http://127.0.0.1:5174/'
python verify_demo.py
```

The simulator appends traffic. Its in-UI control uses the backend's HYPERION_BASE_URL when spawning the simulator. Keep this variable aligned with the actual server port.

## Preserve and restore private history

Verified source and SQLite backups are stored outside Git in the Windows user's Documents/Hyperion-Private-Backups directory. Never upload that folder or place databases in a source archive intended for GitHub.

Use the restore helper to create a new database file from a consistent SQLite backup:

```powershell
python scripts/restore_database.py --backup 'C:\path\to\private\api_security.db' --destination 'C:\path\to\private\restored-hyperion.db'
$env:HYPERION_DATABASE_PATH = 'C:\path\to\private\restored-hyperion.db'
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8012
```

The helper checks source and destination integrity using SQLite's backup API, opens the backup read-only, and refuses an existing destination. It never automatically replaces a database. If a process is using a file, keep that file and choose another destination. Historical copies are intentionally not applied to the fresh demo automatically.

Do not run backend/database/seed.py or POST /api/governance/reset against important data. The legacy seeder and explicit reset endpoint are destructive by design; they are not part of startup or migration. Neither is required to reproduce the demo.

## Public deployment

This is a loopback-only hackathon demonstration. The target APIs intentionally expose controlled examples of unsafe behavior. Authentication signals and forwarded IPs are not trusted identities. Reset, simulation, debug/export endpoints and broad CORS require production hardening before any public deployment. No backend or database has been deployed publicly by this migration.

## Previous handoff

FRONTEND_HANDOFF.md records the original implementation checkpoint; its Windows source paths and earlier counts are historical. This migration's README and MIGRATION_REPORT.md describe the new checkout and current validation. The full cinematic design is preserved without introducing a new framework.
