# FRONTEND ARCHITECTURE

Implementation specification · source inspected 27 October 2026 · no application code changed

## Source scope and current system

Paths in this document are relative to `C:/Users/anime/Documents/HYPERION-Networking/`. Inspection was limited to the active frontend entry, imported views/helpers/styles, relevant graphics lifecycle, gateway contracts and product API serializers. No database contents, credentials or unrelated repository were inspected. Historical application screenshots in `docs/screenshots/` were reviewed alongside source; their README dates them to 16 October and identifies a synthetic-only capture database. They are not evidence of current live traffic or current runtime performance.

`frontend/package.json` specifies React/ReactDOM 18.2, TypeScript 5, Vite 4.3, Chart.js 4.5/react-chartjs-2 5.3 and Tailwind 3.3 ranges. Three.js, React Three Fiber, GSAP and a rigid-body engine are not installed dependencies. `main.tsx` mounts StrictMode. `App.tsx` owns the persistent native-WebGL environment, a session-gated brand introduction, lazy CommandCenter/Watch routes, and a DEV or motion-lab-mode experiment. `router.tsx` is a small pushState/popstate router, not React Router.

The active operational views are largely nested functions inside `pages/CommandCenter.tsx`. Same-named files under `pages/` must not be mistaken for the live implementation. Existing data behavior is more valuable than existing visual plumbing.

## Component disposition map

KEEP FUNCTIONALITY means preserve behavior/contracts. REBUILD PRESENTATION means replace layout/styling/choreography. RETIRE VISUALS means remove from the production presentation only after the replacement passes. REUSE COMPONENT means carry the implementation forward with narrowly scoped accessibility/style adjustments.

| Current source | Actual purpose | Disposition and concrete action |
|---|---|---|
| `frontend/src/App.tsx` | Route shell, intro gate, environment and lazy boundaries | KEEP FUNCTIONALITY / REBUILD PRESENTATION: replace visual ownership; retain lazy routes and immediate direct-link entry |
| `router.tsx` | Real anchors, modified-click behavior, history updates; navigate currently scrolls top | KEEP FUNCTIONALITY: add scroll/focus restoration and serializable view state; preserve URL contract, no router-library migration required |
| `pages/Landing.tsx` | Hero → demo preview → manifesto → security story → workspace invitation → final CTA | REBUILD PRESENTATION: six-chapter optional arrival plus concise editorial sections; `/platform` remains a valid overview alias |
| `components/AnimatedEnvironment.tsx`, `graphics/environment.ts` | Persistent native WebGL emerald knot/ribbon, pointer parallax, observed/demo accents, fallback and cleanup | RETIRE VISUALS; retain lifecycle requirements and baseline discipline as acceptance criteria; do not port knot shaders |
| `graphics/loop.ts`, `components/Brand.tsx` | Shared loop geometry/mark and wordmark | REBUILD PRESENTATION: retain name; original split-H vector mark; eliminate loop as hero object |
| `graphics/sentinelGeometry.ts`, `graphics/sentinelRenderer.ts`, `pages/EmblemPreview.tsx` | Additional graphics/preview assets, not the active App route entry | RETIRE VISUALS from redesign candidate pool; leave files untouched until import/use review in implementation |
| `components/BrandReveal.tsx`, `brand-introduction.css` | Separate intro WebGL canvas, SVG fallback; timed 2.75 s overlay, Escape/skip, 3.5 s fail-safe | REBUILD PRESENTATION: immediate shell and truthful asset status; keep skip/session semantics; eliminate second context |
| `components/SceneTransition.tsx`, `workspace/RouteView.tsx` | Keyed CSS entry, section direction and 140 ms deferred swap | REBUILD PRESENTATION: one cancellable transition coordinator; route/content correctness precedes motion |
| `HomepageDemoPreview.tsx`, `ContinuousSecurityStory.tsx` | Static scenario narratives and staged marketing controls | RETIRE VISUALS and unsupported claims; retain valid learning themes, clearly distinguish illustrative content |
| `pages/CommandCenter.tsx` shell and nested Overview | Navigation, refresh, status, summary metrics, recent-32 chart and exposure | KEEP FUNCTIONALITY / REBUILD PRESENTATION; split active functions into route modules without altering API meaning |
| Secure Gateway | No route/view present in current frontend | NEW PRESENTATION over existing gateway endpoints; optional admin state isolated from shared health polling |
| Nested Inventory in `CommandCenter.tsx` | Search, method/service/shadow filters, risk/activity sorting, endpoint evidence links | KEEP FUNCTIONALITY; reusable HTML table with stronger type and provenance columns |
| `workspace/CompactTraffic.tsx` | Server summary, exact window, groups, request ledger and pagination | KEEP FUNCTIONALITY / REBUILD PRESENTATION; preserve server scope and 25-row default |
| `workspace/ThreatFindings.tsx`, `findings.ts`, `filters.ts` | Categories, filter selection, historical/new boundary, expansion and evidence fetching | REUSE selectors and IDs; rebuild row/drawer presentation and keyboard behavior |
| Nested RiskIntelligence, `workspace/RiskHierarchy.tsx` | Hierarchy/flat score switch and platform→service→endpoint→finding links | KEEP FUNCTIONALITY; retain semantic details tree as accessible alternative; add optional spatial atlas |
| Nested ExecutionFlow in `CommandCenter.tsx` | Selected alert/event fetch, stages and metadata | KEEP FUNCTIONALITY / REBUILD PRESENTATION as recorded stage rail; no per-stage streaming claims |
| Nested Investigation and EndpointEvidence | Alert fallback fetch, traffic detail, endpoint factors, deep-link handling | KEEP FUNCTIONALITY / REBUILD PRESENTATION; expose all returned linked events, not just first |
| `workspace/ConnectAPI.tsx` | Validate→register→receipt; manual/OpenAPI/demo; honest capture status | KEEP FUNCTIONALITY; rebuild as light editorial form; do not equate catalog registration with gateway policy |
| `pages/Watch.tsx`, `workspace/WatchHyperionWork.tsx` | Controlled scenario execution plus completed-result walkthrough | KEEP FUNCTIONALITY / REBUILD PRESENTATION; replace hardcoded BOLA narrative with returned scenario/stage data |
| `demoPlayback.ts`, `useDemoPlayback.ts`, `DemoPlaybackControls.tsx`, `RecordedRisk.tsx` | Cancellable presentation-only clock and backend-recorded risk | REUSE COMPONENT/logic; controls restyled; playback never initiates requests |
| `hooks/useSecurityData.ts` | One workspace subscription, 7-request batch, 12 s timeout, 5 s post-completion delay, abort/hidden pause/last success | REUSE COMPONENT; keep provider stable across workspace routes |
| `workspace/liveSignal.ts` | Baseline/reconnect suppression, ID high-water marks, bounded observation batch | REUSE logic; separate arrival illustration, observed batch and replay data channels |
| `workspace/SignalObservatory.tsx` | Loop illustration plus inspectable recent traces | KEEP FUNCTIONALITY / RETIRE VISUALS; render a small text signal strip, never persistent scenery behind tables |
| `api.ts`, `workspace/productApi.ts`, `types.ts` | Fetch helpers and response types | KEEP FUNCTIONALITY; add accurate nullable gateway fields and dedicated authenticated control adapter |
| `useSessionValue.ts` | Optional session persistence | REUSE; never store admin secret or raw tokens; migrate shareable filter state to URL incrementally |
| `pages/Overview.tsx`, `APIInventory.tsx`, `SecurityAlerts.tsx`, `Investigation.tsx`; `MetricCard.tsx`, `SeverityBadge.tsx` | Parallel/legacy component candidates, not active route functions in App/CommandCenter | Do not rebuild these by mistake; reuse only proven primitives, defer deletion until import analysis |
| `index.css`, `workspace/design-foundation.css`, `unified-workspace.css`, `product-workflows.css`, `command-center.css`, landing/reveal CSS | Layered global overrides, green palette and motion | REBUILD PRESENTATION in scoped layers route by route; remove old rules only with their retired components |
| `frontend/index.html` | Google-hosted Inter/Space Grotesk links | Preserve families where useful; self-host approved fonts for localhost/offline rendering |
| `motion-lab/*` | GPU/fluid/journey/packet experiments and fixture-backed playground | RETIRE VISUALS as design source; no approved assets/shaders or fixture traffic imported into product; leave DEV isolation intact |

## Backend contract ledger

Base remains `VITE_API_BASE` or `http://localhost:8000`. Retain backend entry `backend/app.py`; `backend/main.py` is a legacy system. The following are observed contracts, not proposed backend APIs.

| Request | Returned / required data | Intended UI use |
|---|---|---|
| GET `/api/health` | status, timestamp, version, optional engine status | Backend connectivity, not upstream/gateway health proof |
| GET `/api/governance/kpis` | total_apis, total_requests_observed, active_alerts, high_risk_endpoints, shadow_apis, avg_risk_score | Overview lifetime/persisted totals; do not relabel as selected-window metrics |
| GET `/api/governance/inventory` | id, method, endpoint, is_shadow, risk_score/reasons, total_calls, auth_type, contains_pii, alert_count, last_seen | Catalog and observation distinction; never show zero-call risk as assessed zero |
| GET `/api/traffic?skip=0&limit=32` | Latest bounded events; extended gateway fields are already serialized | Overview recent observations; not a complete throughput stream |
| GET `/api/traffic/{id}` | Persisted event or 404 | Evidence inspector and gateway decision details |
| GET `/api/alerts?skip=0&limit=100` | alert_id, alert_type, severity, description, timestamp, related_event_ids, recommendation | Newest 100 inbox scope; links can resolve older findings separately |
| GET `/api/governance/findings/{alert_id}` | Single persisted finding or 404 | Deep-link resolution beyond polling window |
| GET `/api/risk-scores?skip=0&limit=1000` | score_id, target_id, score, risk_level, factors, timestamp | Flat endpoint list; current loaded-window cap remains visible |
| GET `/api/risk-hierarchy` | platform and services with endpoints, alerts, evidence_events and factors | Atlas; hierarchical association, not measured service-to-service dependency graph |
| GET `/api/execution-flow?alert_id=…` or `?event_id=…` | has_data, selected IDs, available_events, stages[{step,id,name,status,summary,meta}] | Recorded explanatory flow; request explicit selection where possible |
| GET `/api/governance/traffic-summary` | Server total, unique endpoints, buckets, top 10 groups, top 5 active endpoints, statuses, linked findings, recent 5 and evaluated_at | Traffic chart and summaries |
| GET `/api/governance/requests` | total,page,page_size,items | Historical ledger; page default 25/max 100 |
| GET `/api/governance/connections` | Connection records including capture_method, status, observed_requests | Registration list |
| POST `/api/governance/connections/validate` | ConnectionDraft; returns valid, routes, base_url, capture_options, limitations | Validation preview, not monitoring activation |
| POST `/api/governance/connections` | Valid draft plus authorized; returns record/receipt | Explicit registration only |
| POST `/api/governance/demo/run` | {scenario:normal/scraping/token/bola/shadow, authorized:true}; returns run_id, source, completed execution, event_ids, statuses, selected_request, findings, flow | Real local scenario; recorded playback after completion |
| POST `/api/governance/simulate` | Existing legacy controlled simulation | Preserve functionality behind a secondary explicit action; never call from arrival |
| GET / POST `/api/governance/gateway` | Admin-authenticated snapshot / ControlInput | New Secure Gateway page; details below |
| `/gateway` and `/gateway/{path}` | Fixed local reverse proxy; methods GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS | Existing networking path; visualization must not send traffic automatically |

Traffic-summary parameters: `period=15|60|1440|all`, `search`, `method=all|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS`, `status=all|1..5`, `group=endpoint|caller|status|interval`, `interval=1..1440` minutes, ISO `start` and `end` with timezone. Requests accepts the shared filter subset plus `page`, `page_size`, `sort=time|endpoint|status`, `order=asc|desc`; no group/interval. There is no source or gateway-decision filter in these endpoints. Do not create a UI suggesting server-wide decision counts or source filtering. A decision filter may apply to an explicitly labeled loaded page only; default is simply a visible decision column.

### Gateway adapter and semantics

Snapshot: `enabled:boolean`, `shadow_policy:'FLAG'|'BLOCK'`, `rate_limit:number`, `rate_window_seconds:number`, `upstream:string`. Only `enabled` and `shadow_policy` are mutable through ControlInput; extra fields are forbidden. Rate settings come from environment and are read-only in the frontend. Upstream is fixed `http://127.0.0.1:8001`; catalog registration must not change it.

Both GET and POST require a loopback peer, an allowed localhost origin, and header `x-gateway-admin-secret` matching configured `HYPERION_GATEWAY_ADMIN_SECRET`. Missing server secret returns 503; rejected origin/client/secret returns 403. The UI needs a password input whose value stays in memory in a dedicated control provider; never VITE env, URL, localStorage, sessionStorage, logs, screenshots or exported evidence. Clear on lock/leave/reload. No new auth system or backend weakening is proposed. Admin failure must not fail public evidence polling. “Unlock local controls” fetches the snapshot; no request before the user supplies the secret.

Apply flow: fetch current snapshot → edit local draft → review old/new enabled/policy → explicit Apply → POST supported fields once → render returned snapshot → optional GET reconciliation. No optimistic security-state transition, automatic retry or scroll-triggered mutation. In-flight timeout yields “Change outcome unknown; refresh controls,” not rollback. The backend has no revision/CAS field; re-fetch before applying and disclose concurrent-controller limits. Gateway policy state is in memory and can reset on backend restart; do not label it permanently saved.

Decision is not HTTP status. ALLOW denotes no gateway block/flag decision and can accompany an upstream error; FLAG forwards while recording a concern; BLOCK prevents forwarding for the gateway's enforced rules. Upstream HTTP 403 can occur with ALLOW. Invalid paths and request-size safeguards can still BLOCK when optional enforcement is disabled. Shadow FLAG/BLOCK and rate rules apply when enabled. `BYPASSED` is an ALLOW reason, not evidence that traffic was protected. 502/504 transport outcomes must retain their returned decision and reason rather than becoming BLOCK in the UI.

The existing allowlist in `backend/gateway/policy.py` is separate from Connect API registration. There is no frontend route-policy editor API. Show the distinction in plain copy; do not derive enforced route coverage from catalog inventory.

Extend frontend event types in a later implementation with optional nullable `request_id`, `source`, `gateway_decision`, `decision_reason`, `upstream_status_code`, `response_size_bytes`, `latency_ms`, `service_identifier`, plus `finding_ids` array. Validate runtime values; unknown strings render neutrally. Existing events may have nulls. Do not infer gateway provenance from endpoint names. `product_traffic.traffic_record` redacts token to null, while legacy traffic/detail serializers can expose token; presentation adapters must omit credentials from UI/model props and exports.

The Watch endpoint currently sends controlled requests through the integrated app's middleware, not the fixed `/gateway` proxy. Its completed response is not proof of ALLOW/FLAG/BLOCK enforcement. Do not market this as a gateway policy test; a later gateway demonstration would require a separately scoped implementation and verification.

## Rendering decision

Use **Three.js with React Three Fiber 8 for the current React 18 application**, Blender-authored GLBs, and GSAP/ScrollTrigger for the arrival's scalar timeline. Stay on a vetted compatible set of exact package versions selected at installation; do not install current latest majors blindly. Official [R3F introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) pairs Fiber 8 with React 18 and Fiber 9 with React 19. A React-major upgrade is outside this redesign's minimum scope.

| Option | Assessment | Decision |
|---|---|---|
| Extend native WebGL | Small dependency cost, but manual model/material/animation/picking/resource pipeline would consume the visual budget | Retire production renderer after replacement; no new general engine |
| Direct Three.js | Strong authored-asset support with explicit lifecycle, but more manual React synchronization | Valid fallback if compatible Fiber dependencies fail a bounded integration spike; do not build both |
| R3F + Three.js | Reusable scene modules and event handling alongside React; imperative frame work remains separate | Preferred, one Canvas and explicit asset ownership |
| GSAP/ScrollTrigger | Seekable timeline and scroll progress suitable for authored camera track | Use for arrival only; CSS/WAAPI handle small DOM transitions |
| Native scroll-driven CSS only | Excellent DOM effects but insufficient by itself for multi-object camera/evidence scene state | Use native scroll and CSS layout, not a competing camera timeline |
| Runtime rigid-body world | Expensive and nontrivial to reverse accurately | Not required; bake principal collision/debris animation in Blender |
| Pre-rendered film | Predictable look, poor direct manipulation and reverse seek on compressed video | Optional user-played promotional clip; static posters are universal fallback |
| GPU particles/fluid | Useful for localized ambient/pointer detail, capability and fill-rate cost | Optional enhancement; never the architecture or security-data source |

[ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) supports progress-linked animation; HYPERION's exact timeline, damping and checkpoints are original requirements. No smooth-scroll library, physics engine, large effect bundle or extra state library is required initially. Review dependency licensing and local decoder packaging at installation.

## Proposed module structure

This tree is a target structure, not files created in this planning stage. Preserve existing adapters while extracting views incrementally.

```text
frontend/src/
  App.tsx
  router.tsx
  api.ts
  types.ts
  app/
    AppShell.tsx                 # marketing/operational shell selection
    WorkspaceShell.tsx          # stable provider, rail and outlet
    RouteTransition.tsx         # cancellable DOM transitions, focus/scroll restore
    VisualPreferences.tsx       # system reduce + full/light/still preference
    routes.ts                   # existing URLs + gateway route
  data/
    SecurityDataProvider.tsx    # one useSecurityData owner
    evidence.ts                 # ID resolution, query precedence, abort handling
    gatewayApi.ts               # authenticated GET/POST control adapter
    gatewayTypes.ts             # snapshot, draft and decision types
    presentation.ts             # safe nullable view models, no credentials
    provenance.ts               # observed/replay/illustrative source separation
  design-system/
    tokens.css
    reset.css
    typography.css
    layouts.css
    controls.css
    motion.css
    Icon.tsx
    DecisionBadge.tsx
    SeverityBadge.tsx
    DataTable.tsx
    EvidenceLink.tsx
    FreshnessStamp.tsx
    AsyncRegion.tsx
    DetailPanel.tsx
    FilterBar.tsx
  visual/
    SceneHost.tsx               # single Canvas, errors, capability/fallback
    SceneDirector.ts           # exclusive camera/scene state ownership
    AssetRegistry.ts           # shared ownership and disposal
    QualityController.ts       # measured tier changes
    assetManifest.ts           # local URLs, versions, transfer budgets
    sceneTypes.ts
    arrival/
      ArrivalPage.tsx
      ArrivalCanvas.tsx
      chapterTrack.ts          # deterministic pose evaluator
      cameraTrack.ts
      ArrivalCopy.tsx
      ChapterNavigation.tsx
    gateway/
      InspectionArray.tsx
      GatewayScene.tsx
      DecisionTrace.tsx
    risk/
      RiskAtlas.tsx
      atlasLayout.ts           # stable service IDs, hierarchy, no inferred edges
      HierarchyList.tsx
    effects/
      SurfaceParticles.tsx
      PointerField.ts
      ContactWave.ts
    materials/
      materialLibrary.ts
    fallback/
      ScenePoster.tsx
      StaticNetworkFigure.tsx
  features/
    overview/OverviewPage.tsx
    gateway/GatewayPage.tsx
    gateway/GatewayControlProvider.tsx
    gateway/PolicyReview.tsx
    traffic/TrafficPage.tsx
    inventory/InventoryPage.tsx
    findings/FindingsPage.tsx
    risk/RiskPage.tsx
    flow/ExecutionFlowPage.tsx
    investigation/InvestigationPage.tsx
    investigation/EvidenceRail.tsx
    connect/ConnectAPIPage.tsx
    watch/WatchPage.tsx
  hooks/useSecurityData.ts      # retained first
  workspace/                   # retained helpers during migration
frontend/public/hyperion-2/
  models/ textures/ posters/ fonts/ decoders/
design/hyperion-2/assets/
  source/                      # future .blend and material sources, never runtime
  reviews/                     # future contact sheets and provenance manifests
```

## Ownership and lifecycle

Data path: existing backend → fetch adapters → stable workspace provider → safe view models → DOM views and optional scene props. Scene selection emits IDs to router/selection state. The scene does not fetch, mutate backend state, recompute risk, hold credentials or generate records.

Route state, data state, visual state and playback state are separate. `SceneDirector` state: poster / loading / ready / active / resting / suspended / lost. One persistent host is lazy-mounted only when needed. Data-only direct entry must not download the cinematic bundle. Switching from arrival to gateway/risk reuses the host and common assets; data screens set demand rendering and release heavy scene resources after a short grace period. If context is released, the provider and selected evidence remain intact.

Keep React out of per-frame state: positions, velocity, camera and progress in refs/typed buffers. Use React for semantic selection, fetch state, accessibility and mode changes. [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) documents demand rendering, invalidation and shared/instanced geometry; here demand mode is mandatory for settled operational scenes.

Use reference-counted assets. A chapter unmount releases only its unique targets; shared materials survive until no consumers remain. Cleanup cancels frame/tween work, aborts pending scene loads where supported, ignores late completions, disconnects resize/visibility handlers, disposes render targets and unique textures/materials/geometries, and releases worker/decoder instances when unused. Three.js resources need explicit ownership and disposal; see [cleanup](https://threejs.org/manual/pages/cleanup.html). Verify StrictMode mount→cleanup→mount without duplicate listeners or Canvas instances.

On context loss, show the poster immediately with retry; keep DOM usable. Retry once through a clean host, then stay on fallback if it fails. Never reload the page or clear a user's evidence selection. Pause frame work, pointer fields and hidden polling on visibility loss; resume from stored progress without a delta-time jump. No frames while the host is offscreen or on a settled data-only route.

## Loading, quality and local delivery

Phase 0: HTML shell/text + approved poster; all links usable. Phase 1: local font and minimum geometry/materials. Phase 2: optional high-resolution maps and particles. Show “Preparing scene” / “Scene ready” and optional actual completed asset count. Percent is permitted only for a known byte denominator and must exclude unspecified work; prefer no percentage. Asset completion and backend availability are independent states.

GLB geometry compression uses a tested Meshopt path, texture compression KTX2 with local decoder assets, plus uncompressed/fallback poster support. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader) exposes KTX2 and Meshopt integration; confirm the chosen version during the build spike. No CDN decoder or external font dependency at runtime.

Quality tiers: high desktop DPR≤1.5, ≤250k visible triangles/120 draw calls/12k dust points, local fluid 256²; medium DPR≤1.25, ≤120k/80 calls/4k points, fluid 128²; low DPR≤1, ≤60k/45 calls/1k points, no fluid/bloom; still uses approved posters and HTML. These are ceilings, not goals. No full-screen fluid. Downshift after rolling frame-time p95 >25 ms for 2 s; at low tier >40 ms for 3 s use still mode. Only upshift after 15 s stable headroom, at a chapter boundary; honor explicit user preference and reduced motion. Capability detection, not user-agent labels, chooses initial support. Memory estimates and quality telemetry are QA-only.

## Data consistency and navigation

Keep existing bounded polling behavior, including its fail-fast whole-snapshot limitation. A later partial-resource strategy needs an explicit separate decision; do not silently mix new KPIs with stale inventory. Add view-level freshness for queries with separate filters. A response belongs to its query key; on filter failure show prior results only with their previous query label, never as current results. Cancel obsolete requests and reject stale completion by selection/query key.

Do not claim the five-second delay is an exact wall-clock update cadence; it is scheduled after a batch completes. Pause/hold a visible list for reading without silently changing what “latest” means. New records use a count/banner to avoid moving the focused row. The snapshot is bounded: missing records are not proof of absence.

Preserve real anchor behavior, deep links and modified clicks. New filter URL keys are optional additions, not a rewrite of evidence URLs. Use stable IDs for selection. For conflicting investigation query IDs, prioritize explicit `event`, validate its relationship to `alert`, and show a mismatch rather than inventing a join; standalone `endpoint` is a separate context. Return links restore prior filter, page, selection and scroll. Escape closes detail/menu and restores trigger focus. Motion preference is never a prerequisite for data access.
