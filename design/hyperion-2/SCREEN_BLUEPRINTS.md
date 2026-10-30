# SCREEN BLUEPRINTS

HYPERION 2.0 · implementation specification · 27 October 2026

## Shared rules

Use the three-mode identity and inspection seam defined in `CREATIVE_DIRECTION.md`. Operational views prioritize labeled data, 16 px body text, 12 px minimum metadata, ≥44 px targets and visible focus. Keep existing URLs and evidence IDs. Show source, query scope and last successful refresh. Distinguish no data, no match, not evaluated, not recorded, stale and unavailable. A 3D view always has a complete HTML equivalent. Never show credentials, invent live traffic or call an animation a security decision.

Desktop: 64 px masthead, 208 px labeled rail, 32 px content padding, max 1600 px content. Tablet: collapsible labeled rail. Phone: full-text drawer and one-column content. Chart data needs a text summary and table. Native links preserve browser history and modified clicks.

## Homepage — `/` and `/platform`

- **Composition / 3D:** Void hero with authored asymmetric Inspection Array at right, two-line statement at left; six chapters lead to a quiet paper explanation and one workspace invitation. `/platform` remains a system-overview alias. No fabricated counts.
- **Signature interaction / tasks:** Reversible scroll and bounded pointer displacement explain observation → decision → evidence; users can enter workspace or Watch immediately.
- **Data / controls:** No backend required. Enter command center, chapter links, skip, Pause, Full/Light/Still and Watch are real controls.
- **Navigation / access:** Direct operational links bypass arrival. DOM headings and chapter summaries follow reading order; scene is illustrative. Phone uses separately composed posters and text below imagery.
- **States:** Approved poster and links render immediately; asset readiness is separate from backend health. A failed scene leaves the poster and still-mode link.

## Navigation — every route

- **Composition:** Quiet masthead and grouped rail: Monitor (Overview, Traffic, Inventory), Analyze (Findings, Risk, Flow, Investigation), Configure (Gateway, Connect). Watch is a utility. A thin seam marks selection.
- **Signature interaction / tasks:** Selection marker moves 160–220 ms; route commit and focus occur immediately. Breadcrumb and Back to results preserve filter/page/scroll context.
- **Data / controls:** Shared health/freshness only; Gateway admin status is separate. Named links, drawer toggle, refresh and visual preference.
- **Navigation / access:** Preserve current paths/query IDs and 404 behavior. `aria-current`, landmarks, visible focus and Escape/focus-return on drawer. No 3D behind navigation.
- **Responsive / states:** Full rail ≥1200 px, collapsible to 768 px, full-name drawer below. Navigation works before telemetry/scene; unknown health says Checking backend.

## Loading and brand reveal

- **Composition / interaction:** Immediate wordmark and approved poster or workspace shell. On minimum scene readiness, align first frame and dissolve poster over 180 ms. No blocking timed overlay or fake percentage.
- **Tasks / data:** Let users proceed, retry or choose still. Scene asset status and backend fetch status are separate.
- **Controls / access:** Enter workspace, Continue with still, Retry scene; polite stage announcements, reduced-motion instant swap. No second WebGL context.
- **Responsive / states:** CTA stays accessible on phone. At 8 s unresolved scene loading, emphasize still/retry; corrupt asset or context loss retains usable content.

## Command Center / Overview — `/command-center`

- **Composition:** Four typographic metrics, activity/exposure split, compact findings and small Gateway entry. No persistent animated backdrop.
- **Signature interaction / tasks:** Metrics open scoped views; new-observation chip reveals records without moving a focused row. Inspect exposure, shadows, recent findings and freshness.
- **Data / controls:** Existing health, KPIs, inventory, latest 32 traffic, alerts, risk and hierarchy. Current chart is a latest-32 sample unless deliberately replaced by server summary. Refresh, shadow link, evidence links, Watch.
- **Navigation / 3D:** `?shadow=true` and alert links persist. Optional still gateway crop only, no live scene.
- **Access / responsive / states:** Explain chart scope; provide table. Metrics 4→2→1 columns. Empty data invites Connect/Watch without safety claim; stale snapshot shows timestamp and Retry.

## Secure Gateway — new `/command-center/gateway`

- **Composition:** Bounded authored gate viewport left, policy/evidence instrument right, recorded requests below. The first desktop viewport shows a decision legend and an evidence row.
- **Signature interaction / tasks:** Selecting an actual gateway event illustrates its returned ALLOW (passes), FLAG (passes with witness), or BLOCK (stops). Inspect reason, upstream HTTP, evidence and policy; optional admin changes use review→apply→returned state.
- **Data / controls:** Admin GET/POST `/api/governance/gateway`; `/api/governance/requests` and `/api/traffic/{id}` for records. Unlock/Lock, enabled draft, shadow FLAG/BLOCK, Review, Apply, Refresh, list/scene. Rate/window/upstream are read-only. Secret stays memory-only. No route-policy editor, arbitrary upstream, synthetic packet generator or decision totals that backend does not supply.
- **Navigation / access:** Event link opens Investigation; HTML path duplicates scene. Separate HTTP status from decision: FLAG may forward; ALLOW may precede upstream error. Null decision says Not recorded. Policy visual state changes only after response.
- **Responsive / states:** Under 1000 px stack controls; phone defaults to HTML path. Locked controls leave recorded evidence available. 403/503 explain authentication/configuration; POST timeout says outcome unknown and offers refresh before retry. No rows means none in loaded page, not zero total.

## Traffic Activity — `/command-center/traffic`

- **Composition:** Scoped totals, 260 px Chart.js activity figure, distributions, recent list; `?explore=true&page=1` favors ledger.
- **Signature interaction / tasks:** Pick a chart interval to set an exact timestamp filter; keyboard table offers same action. Search, filter, paginate and open evidence.
- **Data / controls:** Server `/api/governance/traffic-summary` and `/requests`, including period, method, HTTP class, exact timezone window, grouping, interval, sort, order and page. Show bucket_seconds, evaluated_at and bounded top groups. No server-wide gateway-decision filter exists.
- **Navigation / 3D:** Preserve explore/page/filter state returning from Investigation; reset page on filter changes. No 3D.
- **Access / responsive / states:** Chart summary/table, exact times, phone record sections with path/HTTP/decision/evidence. Distinguish empty period from no match. Prior-query data is visibly marked on failure; stale response never replaces new query.

## API Inventory — `/command-center/inventory`

- **Composition:** Search/filter line and precise table; selected endpoint opens context drawer. Method/path is the dominant label.
- **Signature interaction / tasks:** Selection seam follows a row while factors and evidence open. Find shadow, managed, registered-only and observed routes.
- **Data / controls:** Existing inventory and hierarchy membership. Search, method, service, Shadow only, risk/activity/path sort, clear and Connect. Risk is Not evaluated for zero-call registrations; observed auth is not enforced auth.
- **Navigation / 3D:** Preserve `shadow=true` and endpoint ID; drawer links to Investigation. No 3D; optional small SVG hierarchy only.
- **Access / responsive / states:** Semantic sortable table, wrapping paths; narrow layout keeps method/path, status, risk and drill-down. Empty catalog invites registration; empty filters offer reset; missing ID gives not-found.

## Threat Findings — `/command-center/alerts`

- **Composition:** Four detector categories, explicit newest-100 scope, filters, large readable rows and contextual detail panel.
- **Signature interaction / tasks:** Category underline moves while selection stays stable. Triage by detector/severity; inspect recommendations and every linked request.
- **Data / controls:** Existing alert snapshot, selectors and finding-by-ID fallback; category, severity, search, new-since-opened, clear, expand and open Investigation. New does not mean unread.
- **Navigation / 3D:** Preserve alert ID and inbox filters. No 3D.
- **Access / responsive / states:** Separate severity from gateway decision; closed detail has no focusable descendants. Phone detail becomes inline/full-width. No findings is not safety; missing evidence remains an explicit gap.

## Risk Intelligence — `/command-center/risk`

- **Composition:** Platform score/factors and time above service atlas plus explanation panel; equal-value hierarchy list and endpoint-score view. Breadcrumb: platform→service→endpoint→finding→request.
- **Signature interaction / tasks:** Select a terrace; one bounded camera move reveals endpoints and recorded reasons. Compare services, understand scores, reach evidence.
- **Data / controls:** `/api/risk-hierarchy` and `/api/risk-scores`; never recompute/display a different risk score. Spatial/List/Endpoint modes, service selection, breadcrumbs, Reset view, Why this score and evidence links.
- **Navigation / 3D:** Authored terrace kit expresses returned hierarchy only; no invented service-call edges or traffic magnitude. Stable IDs drive selection and optional URL state; Back restores level.
- **Access / responsive / states:** DOM tree operates every selection; 200% zoom/phone defaults to list. Registered-only is Not evaluated. Missing selected ID after refresh returns to parent with explanation. Context loss retains list.

## Execution Flow — `/command-center/flow`

- **Composition:** Selector/provenance header, seven returned stages in a rail and active metadata below.
- **Signature interaction / tasks:** Select a recorded stage to inspect its returned summary/status; open linked request/finding. Presentation never implies per-stage streaming latency.
- **Data / controls:** `/api/execution-flow?alert_id=…` or `?event_id=…`; event chooser, previous/next, step buttons, metadata disclosure and Investigation link. Render actual returned stages even if their number changes.
- **Navigation / 3D:** Preserve alert/event, optionally stage. No 3D; SVG connector plus HTML is sufficient.
- **Access / responsive / states:** Ordered stage list and keyboard controls; phone vertical stepper. `has_data=false`, 404 and errors keep selection and provide real navigation, not a fictional processing animation.

## Investigation — `/command-center/investigation`

- **Composition:** Light-paper Evidence Desk: relationship rail, readable case file and decision/risk facts. Long IDs and paths remain selectable.
- **Signature interaction / tasks:** Choose among actual linked requests; inspect identity/target/HTTP/decision/reason, recommendation and risk factors; copy evidence URL and return to filtered list.
- **Data / controls:** Finding snapshot or `/api/governance/findings/{id}`, `/api/traffic/{id}`, inventory/hierarchy and optional execution flow. Related-event chooser, exact-time, sections, Flow and Back. Do not claim raw payload/header access or cryptographic sealing.
- **Navigation / 3D:** Existing `alert`, `event`, `endpoint` URLs remain. Conflicting IDs show mismatch. Optional static gate cross-section only for gateway-sourced record; HTML path remains primary.
- **Access / responsive / states:** Every fact labeled with source/time; redact token from presentation. Phone uses top relationship disclosure and full-width case file. Finding without event, missing event, loading and stale are distinct; no invented joins.

## Connect API — `/command-center/connect`

- **Composition:** Paper form with Define→Validate→Register→Capture status rail; max 760 px main column and connection list below.
- **Signature interaction / tasks:** Validated route list becomes a review and accurate receipt. Register authorized routes, import JSON or choose built-in demo; understand capture boundary.
- **Data / controls:** Existing connections validate/register/list endpoints. Manual routes, OpenAPI JSON (<1 MB), demo, authorization checkbox, Validate, Edit, Register, Refresh and Connect another. External URL is never fetched by this flow.
- **Navigation / 3D:** Receipt links to inventory or Watch. Registration does not alter the fixed gateway allowlist. Static 2D explanatory diagram only.
- **Access / responsive / states:** Labeled fields/errors and native file input; single column on phone. Invalid JSON retains draft. Registration timeout is unknown outcome: refresh list before retry. External origin remains Registered only until actual capture exists.

## Watch Hyperion Work — `/watch`

- **Composition:** Scenario selector and explicit run action, then returned result with 60/40 narrative/evidence layout and always-visible playback controls.
- **Signature interaction / tasks:** One authorized local run produces a completed result; stage scrub/replay changes presentation only. Inspect actual request, finding/no-finding and evidence.
- **Data / controls:** POST `/api/governance/demo/run` with `scenario`/`authorized`; use returned run_id, event_ids, statuses, selected_request, findings and flow. Scenario, unchecked authorization, Run, Previous/Next, Play/Pause, Replay presentation and explicit Run again.
- **Navigation / 3D:** Evidence/Flow links preserve IDs. Optional small illustrative object after result cannot claim gateway enforcement: this demo uses integrated middleware, not the fixed gateway proxy.
- **Access / responsive / states:** Full textual results; manual default; phone stacks narrative/evidence. Running is indeterminate backend wait, not staged execution. 409/403 and uncertain failure are specific; no-finding completion is valid.

## Cross-view acceptance path

Select a real gateway event → Investigation by event ID → a linked finding if returned → Execution Flow → Back to the same request page. Separately, Risk service → endpoint → returned finding → request retains IDs and breadcrumb. If a link is absent, the path stops visibly at that absence. Empty databases still support navigation, registration and explicit controlled demonstration.
