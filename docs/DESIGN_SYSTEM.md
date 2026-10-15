# HYPERION design foundation — milestone 01

## Scope

Separate branch: codex/hyperion-editorial-design, based on release dbd4156. Only shared shell, identity/loading, WebGL signal treatment and Threat Findings are redesigned. Existing inventory, traffic, risk hierarchy, seven-stage execution flow, investigation logic, simulations and database schema remain intact. The only backend change is the verified dashboard self-ingestion fix below.

## Direction and references

Cinematic restraint plus editorial precision: near-black open space, white reading hierarchy, controlled emerald signals, thin dividers, no per-finding cards.

The authorized browser was used to inspect [Hyperion home](https://www.hyperion.inc/), [Press/News](https://www.hyperion.inc/news-press) and [Yuvrik](https://yuvrik.com/). Observed: sparse text navigation, dark fields, Press/News text categories and fine active rule, editorial image/text pairing, Yuvrik's large white headline hierarchy and compact navigation. Some media/reveals were blank between captures. Exact reference timings and hover behavior were not measured; durations below are original choices. No source branding or assets were copied.

## Identity and type

The original loop emblem projects the same (2,3) parametric centerline family as the approved WebGL sculpture. Brand/Mark provides static and animated versions. Navigation stays still; loading uses a luminous stroke traveling its real SVG path.

Retain Space Grotesk display, Inter reading type and system-monospace metadata, with existing fallbacks. No new dependencies or fonts. Regular-weight tightly tracked titles; small spaced labels; full explanations remain available in expanded findings.

Tokens: paper #f0f3f1, soft text #a2afa8, emerald #71dab0, hairline #b5d9c31d. An 8px spacing base with optical metadata adjustments.

## Shared shell

Compact numbered text rail, one gliding active line, aria-current, keyboard focus and a native labeled mobile selector. Connection reflects real snapshot success/failure. Header, atmosphere and one WebGL canvas persist across categories. Operational atmosphere is deliberately quiet; marketing layout is not redesigned.

## Findings reference implementation

ThreatFindings, Finding, selectFindings and detectionName create a divider-led stream: severity, category, evidence-supported endpoint, timestamp, explanation, arrival and evidence availability.

Inline category buttons have aria-pressed and a sliding rule. Search covers description, ID, category and endpoints from loaded evidence. Severity and arrival filters combine with categories. Clear filters restores all results. Existing bounds remain: newest 100 findings, newest 1,000 traffic records.

Selection expands real context and request evidence in place. Missing details are fetched only for expanded findings, with close/unmount cancellation. Historical missing evidence is explicit; no endpoint or request is inferred. Investigation deep-links retain alert IDs. Optional session storage preserves filters, selected finding and inbox opening time across navigation. “New” is arrival, not read/unread.

## Motion conventions

- Category rule 320ms; outgoing content 130ms; incoming rows 420ms with 22ms stagger capped at six steps.
- Evidence expands over 320ms with a 360ms masked reveal.
- Entrance motion is short and finite. Readable text settles.
- Loading 2050ms, one second longer than prior 1050ms; once per browser session, non-interactive overlay, independent of network completion.
- Existing WebGL rotation gains a Gaussian highlight localized in circular centerline-parameter distance, wrapping at 2pi. Ambient identity motion is not telemetry.
- Reduced motion disables travel, stagger and transitions; WebGL keeps its existing single-frame mode. Visibility, RAF and GPU cleanup remain intact.

## Validation and remaining pages

Baseline: 18 frontend tests and production build passed. Final execution and rendered results are in the completion report; build success alone is not visual verification.

The old runtime on port 8011 predates the release hierarchy routes. Design validation runs current backend on 8012 with a separate SQLite copy and frontend on 5176. Original servers/databases are not replaced.

Overview, Inventory, Traffic, Risk hierarchy, Execution flow and Investigation retain their content systems; their function bodies were compared against the branch baseline and are unchanged. Page-specific editorial migration awaits milestone approval. No SSE/WebSocket or new backend feature work.

### Executed checkpoint verification — 2026-10-16

- 24 frontend tests, TypeScript checking and production build passed.
- 11 backend integration tests and 12 security-engine tests passed; Python compilation passed.
- Authorized browser: desktop and mobile findings, category and combined filters, endpoint search, empty state, expansion, Investigation deep link, restored selection, new-arrival filtering and manual refresh were exercised against actual backend data.
- A single controlled request was appended only to the isolated design copy to verify a real new finding. No historical records were reset or removed.
- Desktop and mobile document widths matched their viewports. One persistent environment WebGL canvas rendered; reduced-motion frame count remained unchanged across navigation. Other pages can also have their existing chart canvas.
- A separate frontend pointed at an unavailable service displayed connection interruption, honest unavailable telemetry and a functional Retry request.
- Reference loading/hover timings were not measured; exact animation values are original implementation decisions. The initial sequence is configured to 2050ms and is not replayed on route navigation.

### Confirmed integration correction

The release's newer /api/risk-hierarchy and /api/execution-flow dashboard routes were absent from the interception middleware exclusion list. Read-only UI polling was therefore generating traffic records and a false shadow-inventory entry. The regression test reproduced both extra records before the fix. Two exclusions were added; no endpoint contract, detector or schema changed. After restarting only the isolated design backend, 27 real dashboard/API reads returned HTTP 200 without increasing the observed request count.

Previously generated self-observation records remain preserved, including in the isolated copy. This fix prevents future ingestion; it does not purge historical rows or silently change past inventory. Older running backend processes need a normal restart to load it.
