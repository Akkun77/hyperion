# DESIGN ACCEPTANCE

HYPERION 2.0 · review checklist for actual local builds · 27 October 2026

This is a future implementation gate. The planning documents themselves do not establish that any criterion passes. Review actual localhost screenshots and interactions; record date, viewport, browser/device, build version, data source/fixture provenance, motion mode and reviewer. Use the same seed dataset only when explicitly labeled. Attach failures to the relevant package in IMPLEMENTATION_ROADMAP.md. No backend mutation or full test run is needed for this documentation stage.

## Visual identity — screenshots

- [ ] At 1440×900 and 390×844, the hero reads as an **asymmetric solid inspection gateway** with visible side faces, bevels, cavity and occlusion. The probe is small relative to 12 m structure; no ring/tunnel/wireframe-sphere silhouette.
- [ ] Six chapter stills plus contact frame match the same authored environment and preserve seam/probe continuity. Camera does not cut through geometry; measured clearance ≥0.35 m.
- [ ] Void starts essentially monochrome; selective lime/cyan appear only at Activation. Emissive accents occupy <8% of hero pixels and do not obscure bevels or text. Operational accents stay <5% typical viewport area.
- [ ] Hero text has deliberate negative space and no collision with detailed geometry at 1440×900, 1024×768, 390×844 or 200% zoom. Mobile is separately composed, not a destructive crop.
- [ ] Instrument views use typography, alignment and dividers instead of thick neon cards. No perpetual WebGL background behind tables or evidence.
- [ ] A screenshot comparison shows Gateway, Risk and Investigation share the seam/material/typographic language without forcing 3D on data-heavy screens. The split-H mark remains recognizable at 16 px.

## Motion and interaction

- [ ] Scroll seek at p=.10→.81→.405 and reverse .86→.34→.64 yields the same authored camera/geometry poses within 2 px at fixed viewport after pointer field settles; no duplicate impact or stuck fragments.
- [ ] Pointer affects local particles with inertia and returns to <5% residual displacement within 1.2 s. Probe, text, buttons and recorded decision stay unaffected.
- [ ] Impact shows causal contact → local plate deformation → nearby rise/rotation → settle, with no full-screen flash, shake or arbitrary wait. Activation does not change backend policy.
- [ ] Camera travels through the gate once, with no roll, infinite tunnel or geometry clipping. Last arrival state rests; no animation remains behind the operational shell.
- [ ] Route transitions finish ≤220 ms and cannot delay a link, stale-content update, keyboard focus or Back. Atlas selection cancels old camera target on rapid input.
- [ ] Reduced motion uses approved stills, no moving camera/particles/fluid, and preserves every route/action. Pause freezes ambience only. Hidden tabs accrue no catch-up jump.

## Loading, performance and cleanup

- [ ] Wordmark/poster and usable links appear without waiting for GLB/fonts/backend. Asset status uses real stages, never an invented percentage. An unresolved scene after 8 s offers Still/Retry.
- [ ] Scene failure/context loss preserves HTML tasks and selected evidence. Repeated route entry and React StrictMode mounts do not duplicate Canvas, listeners or RAF; resource counts return to baseline after leaving.
- [ ] At 1440×900 on agreed mid-tier desktop, active arrival p95 frame time ≤16.7 ms over 30 s; on agreed mid-tier mobile ≤33.3 ms. Record hardware/browser and captures; no claim without measurement. Settled operational data pages draw zero continuous scene frames.
- [ ] Compressed first-scene GLB+maps transfer target ≤3 MB desktop and ≤1.5 MB mobile quality tier; optional later assets load progressively. Track actual transfer and memory. If composition requires more, document tradeoff and gate it explicitly rather than lowering legibility.
- [ ] High/medium/low tier ceilings from VISUAL_ASSET_PLAN.md are observed; sustained p95 >25 ms downshifts and low-tier >40 ms switches to still. No external CDN decoder/font is required on localhost.

## Accessibility and responsive use

- [ ] All routes and evidence paths work keyboard-only; named links, native selection, visible focus, Escape/focus return and skip link. Scene-only affordances have DOM equivalents.
- [ ] Text and controls meet WCAG 2.2 AA contrast in actual composite: normal text ≥4.5:1, large text ≥3:1, non-text controls/focus ≥3:1. Measure dark and paper semantic inks; color is never sole status cue.
- [ ] At 390×844 and 200% zoom no page-wide horizontal scroll, clipped primary actions or obscured evidence. Long paths wrap or scroll within their own labeled region.
- [ ] Chart has a summary and accessible table. Risk atlas has a complete operable hierarchy list. Gateway path has received→decision→upstream HTML. Investigation facts remain selectable text, not texture.
- [ ] Live-region updates are bounded; polling does not interrupt reading every five seconds. Modal focus is contained; closing restores trigger. Reduced-motion preference is honored across route and scene transitions.

## Backend truth and continuity

- [ ] With a fresh database, Overview/Traffic/Findings/Risk show distinct empty or Not evaluated states and no fabricated activity, risk, decision, source or protection claims.
- [ ] For a real recorded gateway event, decision/reason, HTTP status, upstream HTTP, source, request/evidence IDs and finding links match backend responses. FLAG forwards; BLOCK stops; ALLOW can coexist with upstream errors; null says Not recorded. A 502/504 is not silently recast as BLOCK.
- [ ] Gateway controls require valid local admin context; UI secret is memory-only and cleared on Lock/leave/reload. Only enabled and shadow_policy are editable; rate/window/upstream are read-only. After timeout, UI reports unknown outcome and reconciles before repeat action.
- [ ] Connect registration remains distinct from capture and fixed gateway allowlist. External connections read Registered only until actual integration exists. No remote URL is fetched merely to register.
- [ ] Watch Run makes one explicitly authorized local backend request; Replay presentation makes zero. Stage text, findings, score and evidence are taken from returned data, including a valid no-finding result. The local middleware demo is not represented as a gateway enforcement test.
- [ ] Direct/Back/Forward URL paths preserve `alert`, `event`, `endpoint`, `shadow`, `explore`, page and applicable filter state. Risk hierarchy service→endpoint→finding→request and Gateway event→Investigation→Flow work with actual IDs. Missing/old IDs produce explicit 404 or missing-link states.
- [ ] Shared polling remains abortable and hidden-tab aware. After failure, prior data carries timestamp and old query scope; it is not mislabeled as current. Newly reconciled events alone trigger visual accents; initial baseline and reconnect catch-up do not.

## Signoff evidence

For each checked line, store the screenshot or interaction recording, measured value where required, backend response identifier (redacted), and reviewer verdict. Required screenshot set: six arrival endpoints plus contact at desktop and phone, Gateway ALLOW/FLAG/BLOCK/null, Risk selected/unobserved/list, Investigation linked/unlinked, light case-file, reduced motion, loader/fallback and one stale-data view. Do not approve from still screenshots alone: the interaction and backend-truth checks above require an actual running local build.
