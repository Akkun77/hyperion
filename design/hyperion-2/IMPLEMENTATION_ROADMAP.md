# IMPLEMENTATION ROADMAP

HYPERION 2.0 · ordered work packages and gates · 27 October 2026

No production code is authorized by this planning stage. This roadmap is for a later implementation decision. Keep backend/gateway contracts intact; do not use Git or cloud steps as part of these packages unless separately requested. Avoid another full audit: the source/component map and API ledger in FRONTEND_ARCHITECTURE.md are the baseline. Investigate only a specific failed gate.

## Three smallest meaningful prototypes

1. **Static composition (first milestone):** Blender-authored Inspection Array clay and lit still; desktop 1440×900 and mobile 390×844, paired with real DOM headline/CTA. No animated shader. Test silhouette, depth, negative space, text collision and color occupancy against six-point visual review. Deliver scene source, stills and camera/material sheet. Reject if it reads as rings, floating cards or a flat illustration.
2. **One physical consequence:** Same approved scene at approach/contact/settled. Probe reaches plate, 8 large fragments rise/rotate/settle. A progress slider seeks forward/back through p=.34–.50; 3D and poster fallback match. This proves deterministic impact before particles/fluid are added.
3. **One operational relationship:** A real recorded gateway event drives a compact gate illustration plus the HTML received→decision→upstream path. ALLOW/FLAG/BLOCK and null cases retain exact backend semantics. No backend mutation; a small fixture response is allowed in an isolated preview only when visibly labeled fixture.

## Work packages

| Order | Package, owner suggestion | Depends on | Deliverable / gate |
|---|---|---|---|
| 0 | Art director + product/security UX: freeze this brief | Existing eight docs | Approve reference boundaries, palette, exact copy rules and hero composition criteria; record open questions only |
| 1 | 3D artist + visual designer: static composition prototype | 0 | Authored Blender blockout, material/lighting pass, desktop/mobile stills, DOM overlay; **do not begin motion until approved** |
| 2 | Motion designer + WebGL engineer: impact seek prototype | 1 | Fixed-pose contact/debris tracks and exact reverse seek; no full runtime physics |
| 3 | Frontend + security-product engineer: gateway relationship prototype | 1 and backend contract ledger | Event selection with returned decision fields and HTML equivalent; null/FLAG/BLOCK/HTTP mismatch cases reviewed |
| 4 | Frontend architect: scoped design tokens and shell | 1 | Original split-H mark, type scale, masthead/rail/drawer, loading and direct-link shell; no application data regressions |
| 5 | WebGL engineer + 3D artist: full arrival six chapters | 2 and 4 | Shared scene, camera spline, authored asset package, progress timeline, poster/reduced-motion path; performance gate |
| 6 | Frontend + security-product engineer: three signature views | 3–5 | Gateway first, Risk atlas/list second, Investigation Evidence Desk third; real data, URLs and cross-links preserved |
| 7 | Frontend engineer: remaining operational views | 4 and 6 | Overview, Traffic, Inventory, Findings, Flow, Connect and Watch restyled without losing filters, paging or actual-result semantics |
| 8 | Accessibility/performance engineer + designer: optimization and signoff | 5–7 | QA matrix, contrast, keyboard/screen-reader, mobile, 200% zoom, context loss and frame/asset budgets |

Model/task suggestions: a vision-capable design model may compare supplied stills and proposed keyframes; a coding agent can extract route modules and implement the data adapters; a 3D artist owns actual mesh/material craft; a security engineer reviews decision language and policy controls. Do not let generated imagery substitute for modeled geometry or let an assistant invent backend responses. Assign an owner per package and review the concrete artifact at its gate; no parallel rebuild of the whole UI before the first still is approved.

## Contract and effort guardrails

Preserve `backend/app.py`, `backend/gateway`, `database`, detectors, route normalization and rate limiting. Keep source status separate from generated presentation. The gateway UI must handle loopback admin secret in memory, enabled/shadow policy only, fixed upstream and in-memory policy reset. Connect API registration does not edit gateway allowlist. Watch playback does not repeat a run. Existing five-second polling is bounded and pauses hidden; an animated signal uses newly reconciled records only. These facts are in FRONTEND_ARCHITECTURE.md and are pass/fail gates, not optional polish.

Use exact-value cost gates: approve one static hero at two widths; then one reversible impact; then one backend-bound interaction. If any gate fails, repair that prototype before expanding to adjacent screens. Batch asset exports, screenshot review and copy review by milestone. Do not run full application suites for design-only edits. During implementation, run the narrow type/build/backend/interaction checks needed for the changed package, then a single integrated end-to-end acceptance pass at package 8.

## Handoff artifacts and stop rule

Every implementation package supplies a before/after screenshot pair where visual work changed, a short contract check for affected actions, a reduced-motion/phone capture and a list of remaining defects. A screenshot cannot substitute for keyboard or backend verification. No cloud deployment or repository operation is needed to approve a local build. Stop expansion when the eight categories in DESIGN_ACCEPTANCE.md pass on actual localhost builds and the three signature paths work end to end.
