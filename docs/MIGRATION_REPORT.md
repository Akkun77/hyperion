# Full-stack migration verification

Validated on Windows on 2026-10-15 in a new clone of Akkun77/hyperion. The source Sentinel checkout, original Hyperion checkout, existing servers and historical application database were not modified. The original personal repository history and useful legacy modules remain intact.

## Executed checks

- Python compilation: passed for integrated and retained Python modules.
- Security engine: 12 tests passed.
- Isolated FastAPI/database integration suite: 8 tests passed, including additive legacy evidence migration and initialization without data loss.
- Frontend: 5 tests passed; TypeScript checking and production build passed after npm ci from the preserved lockfile.
- Backend startup on loopback port 8011 and frontend development startup on port 5174: HTTP 200.
- Browser smoke test through the in-app browser: landing page rendered, command center displayed the isolated backend's 5 APIs / 29 requests / 4 findings, and clicking scraping finding #4 opened persisted request #27 in Investigation. The emerald cinematic layout was retained.
- Controlled simulation against a new private database: 29 requests, 5 endpoints, exactly 2 shadow APIs, 4 findings (2 BOLA, 1 token replay, 1 scraping), all 4 linked to persisted traffic evidence.
- Explainable endpoint risk scores verified: user profile 85/HIGH, admin export 80/HIGH, debug 60/MEDIUM, balance 55/MEDIUM, payments 10/LOW. Average 58.
- Dashboard polling did not create traffic. This is polling, not server streaming.
- Private backup restore to a new destination passed; attempting to restore over that destination was refused.

## Data preservation and source continuity

The private source ZIP was verified by CRC and per-file SHA-256. The SQLite backup API produced an integrity-checked historical backup containing 271 traffic rows, 24 alerts and 11 inventory endpoints. Prior database snapshots are also retained outside Git. See MIGRATION.md for safe initialization and restore commands.

The personal repository previously tracked a legacy gateway.db with seeded mock users and two audit events, plus four Python bytecode files. These are removed only from the new branch's index; local copies and historical commits are retained. No integrated historical traffic database is included in the release. No license grant is invented; the project owner explicitly confirmed permission to publish the integrated contributions. See PROVENANCE.md.

Migration changes are limited to configuration for isolated database/API URLs, test coverage, safe restore tooling, ignore rules and accurate documentation. The cinematic UI and security-engine implementation were retained.

## Remaining limitations

npm audit reported 9 development-tool dependency vulnerabilities (6 high, 3 moderate), with no critical issues; npm audit --omit=dev reported zero. The lockfile was deliberately not upgraded during migration. Review and patch the development toolchain separately before exposing any dev server beyond loopback.

The application remains a local hackathon demonstration, not production access control. Demo identity headers, debug/export endpoints, simulator and reset endpoints must not be publicly exposed. PII detection is heuristic. Tests emit datetime.utcnow and test-client dependency deprecation warnings. No WebSocket/SSE streaming capability is claimed.

The staged whitespace check reports pre-existing trailing whitespace in transferred source. It is intentionally preserved rather than introducing unrelated formatting changes. Secret-pattern scanning of all reachable original Git blobs and the staged tree found only explicitly reviewed dummy test credentials; no live credentials were identified. Such a scan is not a guarantee that every possible secret format is detectable.
