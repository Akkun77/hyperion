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
