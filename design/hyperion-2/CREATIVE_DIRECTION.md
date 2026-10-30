# HYPERION 2.0 — THE LIVING SYSTEM

Creative blueprint · 27 October 2026 · documentation only

## Mandate and decisions

Build a security instrument with a memorable spatial identity: a monumental inspection gateway assembled from suspended graphite fins. A silver inspection probe approaches its narrow cut, transfers energy into machined channels, and reveals an ordered network behind it. The same cut becomes the selection line in tables, the axis of the risk map, and the connection between a finding and its evidence.

The signature is **the inspection seam**, not a glowing logo. The gateway has two unequal banks of thick, staggered fins over an offset plinth, an open lateral bypass channel, and an oblique vertical incision. It has weight, bevels, recesses and structural supports. No rings, humanoids, lunar terrain, particle faces, endless corridors or borrowed compositions.

All work described here is proposed. Only these eight design documents are created at this stage. Preserve FastAPI, route policy, detectors, rate limiting, SQLite, endpoint normalization and evidence IDs. No Git operations, cloud deployment, production frontend changes or test runs are part of this stage. Scope: `C:/Users/anime/Documents/HYPERION-Networking` only; never HYPERION-GitHub or the unrelated chat workspace.

Read in order: this document → [storyboard](EXPERIENCE_STORYBOARD.md) → [screens](SCREEN_BLUEPRINTS.md) → [motion](MOTION_SYSTEM.md) → [assets](VISUAL_ASSET_PLAN.md) → [architecture](FRONTEND_ARCHITECTURE.md) → [roadmap](IMPLEMENTATION_ROADMAP.md) → [acceptance](DESIGN_ACCEPTANCE.md).

## Evidence and reference discipline

The nine user screenshots are the principal visual reference. Their filenames below refer to `C:/Users/anime/Pictures/Screenshots/`. They were visually reviewed as supplied, including cropped frames. A still can establish composition, surface, occlusion and apparent depth; it cannot prove a simulation algorithm, collision response, pointer coupling, frame rate or reversibility.

| Reference file | Visually verified | Translate into HYPERION | Explicit exclusion |
|---|---|---|---|
| Screenshot 2026-10-27 130211.png | Dense architectural relief, strong perspective, isolated cyan/lime highlights, dark central depth | Thick physical channels with legible foreground/midground/background; limited signal lighting | Do not reproduce the corridor, figures or radial travel composition; use an open asymmetric gantry |
| Screenshot 2026-10-27 130224.png | Monochrome particulate volume, extreme type scale, dark negative space, compact header | Sculptural mass and confident typographic hierarchy | No particle head or giant edge-to-edge imitation wordmark |
| Screenshot 2026-10-27 130230.png | Close particulate detail, uneven scale, luminous pockets, occlusion | Multiple fragment scales and restrained depth cues | A crop does not demonstrate cursor physics |
| Screenshot 2026-10-27 130240.png | Small figure against landscape, suspended debris, central lighting, volumetric-looking atmosphere | Scale established by a deliberately small probe and contact shadows | No astronaut, crater or scene recreation; collision behavior is not proven |
| Screenshot 2026-10-27 130254.png | Narrow crop of vertical glyph trails and spaced typography | Vertical rhythm and layers of information | No Matrix rain; characters must not imply recorded telemetry |
| Screenshot 2026-10-27 130303.png | Widely spaced white logos on black | Confidence through restraint and large quiet regions | No borrowed client logos or implied partnerships |
| Screenshot 2026-10-27 125237.png | Pale editorial ground, large reel panel, rounded crop and clear play action | A calm, light evidence-reading mode and explicit playback control | No montage copying or decorative tilting of evidence tables |
| Screenshot 2026-10-27 130125.png | Reel imagery changes subject; pale surround and translucent foreground form | Clear separation between authored media and page controls | No trains, tracks or transparent ornament over operational content |
| Screenshot 2026-10-27 130141.png | Two large project images, short metadata, generous title spacing | Paired comparison panels and quiet case-file layouts | No reuse of project imagery, logos or names |

Public inspection on 27 October 2026: [Lusion About](https://lusion.co/about/) was opened and scrolled in a browser. The observed sequence moved from a close monochrome particle mass with oversized title to a wider terrain view with a small figure and changed text composition; the header remained available. [Lusion Home](https://lusion.co/) exposes a reel and project navigation; its loading surface was also observed. These observations support spatial continuity and editorial pacing. They do not verify the full interaction system or its internals.

Additional reference roles: [ION](https://exp-ion.lusion.co/) describes its own experience as real-time WebGL and exposes material selection and unsupported-device messaging; use its product/material coherence as a principle. [monopo](https://monopo.london/) provides creative-agency editorial hierarchy and project navigation; its motion was not interactively verified here. [Linear](https://linear.app/) is a reference for operational information hierarchy, not an inspected authenticated app. [Cloudflare Radar](https://radar.cloudflare.com/) exposes geography/time context and observed-measurement framing; adopt explicit scope and provenance, not its global-data claims. Text-rendered values on public sites are not performance or data-quality evidence.

### Behavior deconstruction: facts versus hypotheses

| Topic | What evidence establishes | Unverified / inferred | HYPERION decision |
|---|---|---|---|
| Depth and scale | Occlusion, size variation and relief in supplied images; changing framing in browser | Actual world units and projection settings | Model in meters; use a 0.7 m probe against a 12 m structure |
| Camera | Different frames and scroll states reveal different composition | Exact curves, FOV and acceleration | Author explicit spline checkpoints; no camera roll |
| Pointer | No controlled pointer-response comparison completed | Force radius, solver and damping | Implement bounded displacement only on the arrival scene; specify it independently |
| Particles / fluid | Volumetric-looking particulate mass and translucent forms | Whether these use fluid, vertex fields, video or compute | Hybrid deterministic particle field and localized GPU interaction layer |
| Collisions / debris | Floating debris visible | Causality, real rigid bodies and collision resolution | Bake the probe contact and debris response; no full runtime physics dependency |
| Transformations / reversibility | Forward scroll changes observed composition | Reverse equivalence and hidden-state handling | Require deterministic bidirectional evaluation at every progress value |
| Typography / categories | Oversized type, sparse labels, dark/light contrast | Transition easing and text accessibility quality | DOM typography, smaller readable controls, short category underline movement |
| Lighting / materials | Tonal separation and selective bright regions | Renderer, BRDF, ray tracing, shadow or fog technique | PBR bevels, baked contact detail, controlled key light; limited bloom |
| Navigation / accessibility | Visible header and public menu links | Keyboard completeness, contrast conformance and reduced-motion behavior | Persistent access, visible focus, full DOM equivalents, no scroll trapping |
| Loading / performance | Loader presentation and ION fallback copy | Byte accounting, FPS, compression and quality policy | Measured asset stages, immediate shell, local assets, budgeted quality tiers |

No Lusion source code, shaders, models or textures are needed. Do not inspect or extract them to implement this design.

## Three modes, one design system

**THE VOID — arrival and route thresholds.** Near-black space; silver bevels and bone-white typography. An offset stack of mineral fins has a void cut through its center. Fine fragments follow its grain rather than filling the screen randomly. Approximately 65% of the first frame is quiet or low-detail. Color is withheld until Activation.

**THE NETWORK — gateway and risk exploration.** The fins become structural partitions and service terraces. Cyan is the path of an observed signal, lime is selection and active instrumentation. A selected service is brought forward by framing and contrast, not inflated according to an invented physical metric. Paths express documented hierarchy or recorded request routing, never inferred physical cabling.

**THE INSTRUMENT — monitoring and investigation.** Neutral charcoal surfaces, aligned numbers, generous margins, visible labels. A light case-file sheet is available for Investigation and Connect API; retain the same spacing, type and semantic decisions. No animated background behind rows. The inspection seam reappears as a thin focus/selection marker.

## Palette and semantic separation

| Token | Hex | Role |
|---|---|---|
| void | #080A0C | Arrival background |
| canvas | #101417 | Operational base |
| surface | #192024 | Subtle grouped region |
| raised | #242D32 | Selected region / dialog |
| line | #354148 | Decorative separators only |
| control-line | #73848C | Required control boundaries on dark backgrounds |
| text | #F1F3EF | Main dark-mode text |
| secondary | #BBC5C8 | Supporting text |
| muted | #8D9CA3 | Timestamps and tertiary labels; verify smallest sizes |
| silver | #C8D0D2 | Neutral 3D metal / detail |
| lime | #D2F85A | Primary action, selection, activation accents |
| cyan | #75DDEB | Informational signal paths / focus |
| allow | #A8E6C1 | ALLOW text + check glyph |
| flag | #FFD08A | FLAG text + diamond glyph |
| block | #FF969C | BLOCK text + stop glyph |
| paper | #F1F0E9 | Light editorial canvas |
| paper-ink | #182125 | Text on light surfaces |
| paper-secondary | #4C5A60 | Secondary text on paper |
| paper-line | #78868A | Required boundaries on paper |

On paper, use dark semantic inks: ALLOW #245D42, FLAG #785008, BLOCK #9B263C, focus #166779. Never put pale semantic text directly on paper. Cyan/lime branding is not the decision vocabulary. HTTP error, detector severity, gateway decision and connection health each get distinct labeled fields. Null decision means “Not recorded,” not ALLOW. Tokens are design proposals; contrast must be measured in the actual composite.

Color occupancy in the hero: 85–95% neutral pixels; emissive paths under 8% of the image. Operational accents cover under 5% of a typical view. Bloom must not erase a bevel or blur text.

## Typography, grid and surfaces

Keep Inter for body/UI continuity; use Space Grotesk for headings with a tighter, more deliberate scale, and a locally licensed mono face (IBM Plex Mono proposed) for IDs and request paths. Self-host WOFF2 with system fallbacks. No font purchase assumed. Verify font licenses and exact weights before bundling. Use optical hierarchy rather than more font families.

| Use | Desktop | Mobile | Weight / line-height |
|---|---|---|---|
| Arrival headline | clamp(56 px, 6.4 vw, 104 px) | 44–56 px | 400 / 0.98; tracking -0.045em |
| Chapter statement | 64–80 px | 34–42 px | 400 / 1.05 |
| Page title | 36–44 px | 28–32 px | 500 / 1.12 |
| Section title | 22–26 px | 20–22 px | 500 / 1.25 |
| Body | 16 px | 16 px | 400 / 1.55 |
| Table / controls | 14 px | 14–16 px | 400–500 / 1.45 |
| Metadata | 12 px minimum | 12 px minimum | 400 / 1.5 |
| Data numeral | 36–48 px | 28–36 px | 400 / 1.05; tabular figures |

Spacing tokens: 4, 8, 12, 16, 24, 32, 48, 64, 96, 144 px. Desktop 12-column grid, 24 px gutters, 48 px outer margin at 1440; large-screen content max 1600 px. Tablet 8 columns/24 px margins; mobile 4 columns/20 px margins. Baseline operational row height 52 px; compact option 44 px with 44 px actionable hit area. Do not shrink metadata to fit more columns.

Operational surfaces use one-pixel dividers, 6 px control radii, 12 px dialog radii and no shadow unless layering requires it. Avoid nested card grids. The 3D material system uses rough graphite, satin silver, ceramic end caps and emissive inlays; the HTML UI does not imitate those materials.

Icons: original 20 px, 1.5 px stroke SVG set with square-ended paths and 2 px internal corners. Gateway = split gate; traffic = parallel arrows; inventory = ordered stack; findings = cut diamond; risk = stepped hierarchy; evidence = linked brackets. Preserve text labels; avoid the existing mixed Unicode glyph family. Retain the HYPERION name; redesign the mark around a split H with offset crossbar, assessed at 16 px before final artwork. No loop mark in the final identity.

## Navigation and hierarchy

Homepage: HYPERION, Explore system, Watch, Enter command center, motion preference. Operational shell: persistent 64 px masthead and 208 px left rail at ≥1200 px. Group Monitor (Overview, Traffic, Inventory), Analyze (Findings, Risk, Flow, Investigation), Configure (Gateway, Connect API). Watch is a secondary utility. At 768–1199 px use a labeled collapsible rail; below 768 px use a page title and full-text navigation drawer. Avoid a horizontally compressed row of eight tiny tabs.

Preserve existing URLs and query links. Add `/command-center/gateway` as a frontend route only. Current `alert`, `event`, `endpoint`, `shadow`, `explore` and `page` URLs remain valid. A direct evidence URL bypasses the arrival. Selecting an item is never delayed by cinematic animation.

## Retire / retain

Retire the emerald knot/ribbon hero, loop-based reveal, persistent operational WebGL atmosphere, dotted grain, tiny editorial labels, generic card framing, mixed glyph navigation, repeated marketing panels, and the current page-slide choreography. Motion Lab is research, not approved visual direction. Keep it outside the product flow until an explicit later cleanup decision.

Keep polling cancellation, snapshots and stale-data behavior, provenance-aware signal reconciliation, filters, server pagination/aggregation, registered-only state, recorded risk factors, evidence IDs/deep links, and the demo playback/execution separation. Reuse Chart.js and accessible HTML primitives after restyling. See the exact component disposition table in FRONTEND_ARCHITECTURE.md.

## Copy rules and creative risks

Say “Observed,” “Recorded,” “Last successful refresh,” “Registered only” and “Recorded walkthrough.” Never claim a visual pulse is a live packet or an animation duration is backend latency. Replace current unsupported immutable-ledger/cryptographic-binding wording with “persisted evidence linked by ID.” Do not describe all controls as live or all routes as protected.

The work depends on deliberate modeling and lighting. A procedural mass with more particles will not satisfy it. The aesthetic cost is higher asset-authoring effort; the operational benefit comes from keeping spectacle optional. First deliver a static, authored gateway keyframe and matching DOM composition at 1440×900 and 390×844. Animation is gated on that frame, not used to hide weak composition.
