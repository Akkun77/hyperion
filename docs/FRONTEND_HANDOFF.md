# Unified cinematic workspace / Live Signal

Implemented 2026-10-16 on `codex/hyperion-unified-live-signal`, based on editorial checkpoint `5b0356062e2980d365fde9c55defd3aaf48e42e0`. No merge into release or main; no dependencies added.

## Navigation diagnosis and integration corrections

The reported homepage CTA and category-click failure did not reproduce in the permitted browser. Both desktop and mobile homepage Command Center links opened the workspace; category routes and browser back/forward succeeded. The persistent environment has `pointer-events: none`; initialization is also non-interactive. Do not describe an unobserved overlay fault as fixed.

The Link primitive now leaves external URLs, new-tab targets, downloads, hash links and modified clicks to the browser. Direct tests exercise actual click handlers. Execution selection previously lived outside URL history and auto-selection triggered another request. It now derives from the route query, keeps server auto-selection in the response, and reloads its available events when observed IDs change. Stage selection survives ordinary polls. Browser history restored alert selections correctly.

Inventory retains its ledger, adds backend-derived service-domain filtering, and preserves search/method/sort/service in optional session storage. Traffic preserves search/method/status/range. Risk preserves hierarchy/flat mode. Existing Findings preserves its filters and selected expansion. No request payloads, credentials or tokens are written to session storage.

## Live Signal contract

Uses the existing single workspace snapshot poll, not another subscription or endpoint. No SSE/WebSocket. The seven snapshot requests remain batched, non-overlapping, cancellable and visibility-aware. Traffic loads at most 1,000 records; alerts at most 100; this is not a lossless event transport.

- Initial history establishes a baseline without event animation. Baseline traces are explicitly marked.
- Numeric SQLite traffic/alert ID high-water marks deduplicate subsequent responses, including IDs leaving/re-entering the loaded window.
- New requests/findings must be timestamped after baseline and no more than 30 seconds old (up to 5 seconds future clock tolerance). UTC timestamps without offsets are interpreted as UTC. Large client/server clock differences can suppress animation; records remain visible in normal views.
- New shadow endpoint IDs and changed existing endpoint scores retain actual backend references/values. No invented factors or counts.
- One visual accent per successful changed poll batch. At most 24 signal entries enter a batch, 18 remain in memory, 6 are shown on desktop / 3 on mobile. High-volume activity is coalesced, not replayed as an animation queue. Loaded request counts are distinguished from additional/historical rows.
- Traffic/score changes use emerald; new findings or shadow discovery amber; high/critical findings red. Each trace links to actual event/finding/endpoint evidence or the risk view.
- Failure pauses accents and retains stale observations. Recovery establishes a fresh baseline; catch-up never animates. The SVG mounts a pulse only for a nonempty new batch, avoiding replay on reconnect. Unit tests cover this edge case.
- The primary loop retains slow ambient rotation and its localized path-travel highlight. These continuous effects are explicitly labeled ambient, not activity. A separate one-shot WebGL accent consumes reconciled batches. No per-frame React updates. Listeners/RAF/GPU cleanup, hidden-page suspension, reduced motion and fallback are preserved.
- The preview API is a local demo environment containing controlled simulations. Existing records have no reliable per-record provenance field; the UI says so. No simulation runs automatically.

## Identity and visual foundation

One original (2,3) centerline family supplies the WebGL sculpture, small SVG mark, animated loader, fallback, gateway illustration and favicon. The favicon is a generated vector centerline, not a screenshot. Loading is now 3050ms (previous editorial milestone 2050ms), once per browser session, skipped for OS reduced motion. Internal navigation does not replay it. The loader is presentation timing, not a claim of completed networking.

Marketing layout remains approved and unchanged except the gateway illustration symbol. Operational views use neutral near-black, open sections, restrained text navigation, thin rules and fewer tinted boxes. Seven-stage execution now wraps into a grid rather than requiring a wide horizontal strip; its actual seven stages and metadata remain. Native mobile navigation and all detailed filters/timestamps/auth observations/evidence remain available. Route exit is 120ms, incoming masked reveal 320ms; reduced motion switches directly. Rapid navigation cancels stale transitions.

References were inspected in the permitted browser: Hyperion home, Press/News category selection, and Yuvrik home. Observable cues were the thin category rule, dark negative space, image/text pairing, large clean typographic hierarchy and compact labels. Exact hover curves and transition timings were not measurable; no source assets or branding were copied.

## Self-monitoring

The prior checkpoint already fixed the missing `/api/risk-hierarchy` and `/api/execution-flow` exclusions. No further backend implementation change was needed here. A new regression exercises 40 dashboard reads after a business request and proves counts, alerts, inventory-derived KPIs and in-memory detector baselines stay unchanged. A similarly named non-control route remains monitored. Application HTTP/access diagnostics remain enabled.

Actual running preview: 24 dashboard/API reads left 806 requests and 6 findings unchanged. Old self-observation records, including the historical false shadow hierarchy route, are retained. This work does not purge/reclassify historical SQLite records.

## Executed validation

- Frontend: 37 tests passed; TypeScript and Vite production build passed.
- Python source compilation passed; 12 backend integration tests and 12 security-engine tests passed, using isolated temporary databases. Existing httpx/datetime deprecation warnings remain.
- Browser desktop: homepage CTA; category navigation; direct URL; back/forward; service/shadow filters; path sorting; traffic search/time-range empty state; finding category/severity empty state and expansion; hierarchy expansion/flat mode; execution alert selection, stages and history; investigation evidence; refresh; actual connection loss and automatic recovery.
- Browser mobile at 390px: dropdown navigation, traffic signal layout, inventory ledger, hierarchy, seven-stage flow, Findings filtering/expansion and Investigation evidence. Settled document widths were 375px with 375px content, without horizontal overflow on checked views. Overview also matched viewport width.
- Real WebGL renderer/frame advancement observed. Explicit reduced motion held the canvas at frame 0 across navigation; Light visuals showed the shared loop fallback. OS reduced motion, context loss and unavailable WebGL are additionally tested with the renderer harness. No continuous performance benchmark or quantitative CLS measurement is claimed.
- Controlled simulation was explicitly run on the separate design-preview SQLite copy: 806→835 requests, 6→10 findings. One red observed batch; repeated polls did not increase its revision. New scraping finding #10 linked to persisted request #833 through a clicked trace.
- One explicit controlled `/api/v3/design-signal-probe` request on that same copy returned HTTP 404, persisted as event #836 and new endpoint #7. Its amber shadow trace was observed. It is test traffic, not production activity.
- The task-owned backend was briefly stopped and restarted on the same isolated copy. The UI showed connection interruption/stale retained traces; automatic recovery renewed the baseline without increasing the two observed pulse batches. Other servers and original databases were not stopped or reset.

## Launch / current preview

Current frontend: `http://127.0.0.1:5176/command-center/traffic`, configured to `http://127.0.0.1:8012`. It uses the separate `design-preview.db` copy outside Git, not the original project database. Existing old servers on other ports may be stale.

For a normal launch, use two PowerShell terminals from the repository root. Select an existing private SQLite file with `HYPERION_DATABASE_PATH` if needed; omission uses the existing backend database. Never reset it merely to launch.

```powershell
# Terminal 1 — repository root
$env:HYPERION_BASE_URL = 'http://127.0.0.1:8000'
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000

# Terminal 2 — repository root
$env:VITE_API_BASE = 'http://127.0.0.1:8000'
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/command-center/traffic`. If a port is already occupied, use a free explicit port and keep VITE_API_BASE/HYPERION_BASE_URL aligned; do not terminate unrelated servers.

## Remaining boundaries

Polling is not streaming. Signal animation intentionally omits historical/reconnect catch-up and can coalesce or omit records outside the loaded bounds; use detailed evidence views for inspection. Per-record simulation labeling requires a future provenance design; no schema was added. Existing historical self-monitoring rows remain. Hover timing, frame pacing and initial loader duration were not quantitatively benchmarked. Secrets, databases, logs and build outputs must remain excluded from publishing.

## Archived earlier handoff (2026-10-15, retained verbatim)

The implementation record above supersedes historical counts, branding and route lists below.

---

# HYPERION cinematic frontend handoff

Verified on 15 October 2026. Continue from this implementation; the original React/FastAPI project and database remain in place.

## Implemented

- Black, emerald and white design system; original H mark, Space Grotesk display type, Inter body type, technical mono accents. Hosted Google fonts have system fallbacks.
- Short, non-blocking initialization, once per browser session. No simulated loading percentage. OS reduced motion skips it.
- One persistent AnimatedEnvironment surface: native WebGL torus-knot sculpture, time-based motion, glossy lighting, pointer parallax. The graphics module loads asynchronously. No new runtime packages.
- DPR capped at 1.5 desktop / 1 small screens. Small screens target 30 FPS; desktop requests 60 FPS. Slow measured rendering reduces frame rate. Rendering stops while the page is hidden. GPU buffers/program/shaders and listeners are disposed on teardown.
- Light CSS fallback when WebGL is unavailable or lost; footer preferences offer full motion, reduced motion and light visuals. System reduced-motion preference always takes precedence.
- Homepage, five numbered product chapters, explanatory diagrams clearly labeled as concepts, native keyboard-accessible disclosure panels, scroll reveals, workspace invitation and footer.
- Browser-history navigation with real anchor URLs and back/forward support. No router package was previously installed; the small local router handles these routes.
- Lazy-loaded command center: overview/chart, inventory/shadow filters, searchable traffic, filtered findings, explainable risk disclosures and URL-addressed investigation.
- One shared workspace polling hook, every five seconds after each completed request batch. Requests abort on unmount, don't overlap, suspend while hidden and retain the last successful snapshot on failure. Marketing pages do not mount this hook.
- Functional controlled-demo disclosure invokes the existing POST `/api/governance/simulate`. The existing simulator appends data and never resets records. Actual subprocess output is displayed, followed by refreshed metrics.

## Routes

`/`, `/platform`, `/command-center`, `/command-center/inventory`, `/command-center/traffic`, `/command-center/alerts`, `/command-center/risk`, `/command-center/investigation`.

Investigation selections survive reloads and can be shared locally:

- `/command-center/investigation?alert=24`
- `/command-center/investigation?event=269`
- `/command-center/investigation?endpoint=4`

`/command-center/inventory?shadow=true` opens the shadow filter. Findings load the 100 newest records; traffic loads the 1,000 newest. Overview totals come from governance KPIs rather than page lengths. Historical records are deliberately retained.

## Changed files

- `frontend/src/App.tsx`: new application shell and lazy workspace boundary.
- `frontend/src/router.tsx`: navigation and route subscription.
- `frontend/src/components/Brand.tsx`, `AnimatedEnvironment.tsx`.
- `frontend/src/graphics/environment.ts`: shader, geometry and rendering lifecycle.
- `frontend/src/pages/Landing.tsx`, `CommandCenter.tsx`.
- `frontend/src/hooks/useSecurityData.ts`.
- `frontend/src/api.ts`: retained existing calls; added optional abort signals, typed inventory and simulation call.
- `frontend/src/types.ts`: inventory interface and optional engine-health field.
- `frontend/src/index.css`, `frontend/index.html`, `frontend/public/hyperion.svg`.
- `frontend/package.json`: test/typecheck scripts only; no dependencies added.
- `frontend/tests/environment.test.mjs`: five animation/fallback/lifecycle tests using the existing esbuild package and Node test runner.
- `backend/app.py`: only the existing simulation subprocess call changed to decode UTF-8 explicitly and report nonzero exit status as an error. Pre-change source is preserved in `backend/app.py.before-cinematic-output.bak`. No detector, schema or other backend behavior changed in this frontend assignment.

The older Overview, APIInventory, SecurityAlerts and Investigation page source files remain on disk. The new routed CommandCenter preserves their functionality through shared data and evidence URLs; it doesn't mount their independent polling effects.

## Actual verification

- `npm test`: 5/5 passed. Time-based animation without input; pixel-ratio cap; hidden-page stop/resume; OS reduced motion; explicit reduced motion; unavailable/context-lost WebGL fallback and resource cleanup.
- `npm run typecheck`: passed.
- `npm run build`: passed. Approximate gzip chunks: entry 50.6 KB, workspace/chart 64.3 KB, graphics 2.2 KB, CSS 10.7 KB. Workspace and graphics are separate chunks.
- `python -m py_compile backend/app.py`: passed.
- Mocked simulation subprocess success/failure tests passed; verified explicit UTF-8 argument and exit-status mapping.
- Production-preview HTTP requests returned 200 for all eight listed routes, including investigation deep links.
- Read-only API checks returned 200 for health, governance KPIs/inventory/alerts, traffic, alerts, risk scores, and evidence event 210.
- In-app browser inspected the production landing at 1440x900 and 390x844, with no document-level horizontal overflow. Also checked the development app at 665 pixels wide.
- Observed the continuously changing sculpture without input; measured render-rate diagnostics reported approximately 55 FPS at one desktop checkpoint and 27 FPS at the small-screen checkpoint. These are local samples, not universal performance guarantees.
- Browser checked scroll-to-capabilities, discovery disclosure, inventory search, shadow endpoint inspection, token-misuse filtering, traffic search, expandable risk factors and alert-to-traffic investigation. The overview chart visibly rendered actual recorded traffic.
- Reduced-motion selection produced a static WebGL frame. Light visuals displayed the fallback. Automated tests cover OS media-query behavior; the OS setting itself was not changed.
- Production console check: no warnings or errors in the inspected session. An earlier development HMR error occurred while files were being created; fresh production navigation was clean.
- Ran the controlled simulator twice through the production UI. Each run added 29 requests and four findings (two BOLA, one token misuse, one scraping). All original 213 traffic and 16 alert rows compare unchanged with the pre-demo SQLite snapshot. Final counts: 271 traffic rows, 24 alerts, 11 inventory endpoints. The eight historical shadow entries remain.
- The second UI run displayed correct UTF-8 output, actual acceptance results and updated metrics. New evidence IDs include 269 (scraping), 252 (token), 249/248 (BOLA).
- Database snapshot: `backend/database/api_security.pre-cinematic-ui-20261015-194431.db`.
- Source checkpoints are in `backups/`; final source archive is `frontend-cinematic-final-20261015.zip`.
- Visual evidence: `docs/screenshots/hyperion-desktop.jpg`, `hyperion-mobile.jpg`, `hyperion-command-center.jpg`.

## Run on Windows

From the project root, in separate PowerShell terminals:

```powershell
cd C:\Users\akkun\Documents\Codex\sentinel-api\api-security-command-center
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
cd C:\Users\akkun\Documents\Codex\sentinel-api\api-security-command-center
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Development: http://127.0.0.1:5173/

For the production bundle:

```powershell
npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Production preview: http://127.0.0.1:4173/ . Vite preview is a local demo server, not a deployment service. The FastAPI root is not the React production host; use the frontend URLs above.

## Remaining limits and next steps

No required implementation work remains for the local demo. No streaming, automated blocking or remediation is claimed. The workspace labels its periodic refresh. Real authentication enforcement and historical data cleanup remain outside this frontend assignment.

Further optional QA: profile on physical low-powered phones and Safari/Firefox; manually review keyboard focus and contrast with assistive technology. Browser screenshots verify current Chromium layouts, not every device. The initialization sequence is implemented and session-gated; its exact perceptual timing has not been independently benchmarked.

Do not reset the database to produce a cleaner demo. Use the two named shadow endpoints and newest findings. Keep the source/database snapshots and existing backups. No commit, push, repository reset or ownership/security configuration change was made.

References inspected for composition and context: https://www.hyperion.inc/ and https://conferences.amity.edu/cybercup6.0/ . No assets or branding were copied.
