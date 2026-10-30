# Release verification — 2026-10-16

## Source continuity

Repository: https://github.com/Akkun77/hyperion. Branch: `feature/iconic-security-core`.

The release was prepared from local HEAD `ea17d0f8ed918d9a1a7706b4de69acf912208a5f` plus its five modified and seven untracked frontend source/test files. Before editing documentation, all 136 original source files were compared by SHA-256 with the previously delivered HYPERION-Team-Source.zip: **zero differences**. No ZIP file was restored over local work.

The initial remote branch was `70f5281e294a6e6c9d0c48780ece6207c4700f8a`; local HEAD was one commit ahead. The release includes the manual-first playback commit and the previously uncommitted backend-grounded risk correction/tests. The rejected emblem remains isolated, unrouted development code; it is not mounted on the homepage. No application implementation was redesigned or refactored during release preparation.

## Executed checks

Executed on the current local project, using the Python virtual environment freshly installed during the team-package audit:

| Command | Result |
| --- | --- |
| `python -m unittest discover -s backend/hyperion_security_engine/tests -t backend -v` | 12 passed |
| `python -m unittest discover -s tests -v` | 20 passed |
| `npm.cmd --prefix frontend test` | 58 passed, zero failures |
| `npm.cmd --prefix frontend run typecheck` | Passed |
| `npm.cmd --prefix frontend run build` | Passed, 72 modules transformed |
| `git diff --check` | Passed |

The engine suite retains two existing six-test files. The backend tests isolate and reset only their own temporary test database. Existing datetime.utcnow fixture and Starlette/httpx TestClient deprecation warnings were observed; they did not fail the checks. No dependency manifests or application logic were changed to suppress them.

Verified runtimes: Windows, Python 3.14.2, Node.js 24.14.1, npm 11.11.0, Vite 4.5.14. Fresh installation from the same source snapshot previously succeeded with `python -m venv .venv`, `pip install -r requirements-dev.txt`, `pip check` and `npm ci --no-audit --no-fund`; README setup follows that tested path. Python packages are not fully pinned, so future dependency resolution is not guaranteed identical.

## Actual backend and browser checks

For publication-safe screenshots, the current source ran as separate loopback FastAPI/Vite instances with a new SQLite filename outside the repository. Automatic empty-schema initialization and health (`hyperion_security_engine: connected`) succeeded. Explicit controlled runs returned the expected normal, scraping, token misuse and BOLA results. Observing `/api/v2/debug` and `/api/v1/admin/export` produced two persisted shadow endpoints. Built-in catalog registration succeeded and correctly distinguished registered-only endpoints.

The initial synthetic dataset contained 23 requests and three security findings. The actual browser navigated Overview → API inventory → Traffic activity → Threat findings → Risk intelligence → Execution flow → Investigation, then Watch and Home. The BOLA flow showed alert #3 linked to event #21 and a backend endpoint score of 85. Its real investigation link opened the persisted request evidence. The Watch page required explicit consent and a completed backend result before showing its recorded walkthrough; the browser inspected its Request and Risk stages and compact controls. A second BOLA execution created one additional synthetic request/finding only in the disposable screenshot database.

Nine actual browser screenshots were captured, visually inspected and transcoded to WebP. They contain no broken-connection warning or loading placeholder. Capture scope, synthetic-data provenance and the one whitespace crop are documented in [screenshots/README.md](screenshots/README.md). The homepage was inspected with its original large animated loop, complete headline, description and buttons visible. No browser console errors were recorded in the capture tab.

This release task did **not** rerun a complete wall-clock playback timing audit, mobile breakpoint audit, external traffic collector deployment or optional legacy ML gateway tests. Playback timing/manual-control behavior is covered by the executed regression suite; it was not changed during release preparation. The frontend uses polling, not SSE/WebSocket streaming. The standalone append-only `verify_demo.py` script was retained and documented, not executed against an existing user database for release preparation.

## Publication safety

Only explicit source, tests, documentation and reviewed screenshots are staged. Environment files, dependency directories, build output, actual SQLite files, logs, caches, archives and backups are excluded. Required package manifests, lockfile and public assets are retained. Textual checks review likely token/private-key patterns and credential-like fixtures without printing credential values. Synthetic test inputs and the deliberately dummy debug-route secret are not represented as live credentials. Heuristic scanning cannot prove absence of every possible secret format.

The repository already contains a historical mock database and bytecode in older commits, documented in [PROVENANCE.md](PROVENANCE.md). They are absent from the release tree; history was not rewritten and private local files were not deleted. The earlier provenance statement excluding historical operational captures still applies: the new operational captures use only a newly generated synthetic dataset.

The requested GitHub description and eight topics were updated using existing authenticated repository-administrator access, then read back successfully. No new credential was created, permission changed, force-push performed or main merge requested. The final published commit SHA is reported by the release handoff rather than embedded here to avoid a self-referential commit hash.
