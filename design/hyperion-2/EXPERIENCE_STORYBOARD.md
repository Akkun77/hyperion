# EXPERIENCE STORYBOARD

HYPERION 2.0 · proposed arrival specification · 27 October 2026

## Spatial continuity and interaction contract

One environment: the **Inspection Array**. Two unequal banks of suspended graphite fins flank an off-center seam; a silver probe contacts a receiving plate, illuminates channels, and reveals service terraces beyond the gate. All six chapters use the same authored geometry. No disconnected demo scene, ring tunnel or astronaut sequence.

World coordinates: meters; +Y up, +X right, camera initially on +Z looking toward -Z. Gateway spans X=-6 to +6, Y=0 to 12, Z=-1 to +1; seam centered at X=1.4. Receiving plate P=(1.4,2.4,1.2). Probe length 0.7 m. Service terraces occupy Z=-8 to -26. Camera near/far initially 0.1/120 m, vertical FOV 38°. These are initial blocking values to tune against approved stills, not claims about a reference site's camera.

Arrival is optional and scroll-controlled. Desktop pinned cinematic range: five viewport-heights of travel (`container` total height 600svh, sticky viewport 100svh). Native document scroll controls normalized p in [0,1]; no wheel hijack or forced snap. Chapters have named anchors and Previous/Next buttons. PageDown, keyboard links, touch and scrollbar work. The copy stays HTML. An always-available Enter command center link exits immediately. On mobile default to six short still sections with optional motion; no forced landscape orientation.

No backend mutation occurs on scroll, hover, activation, impact, entry or replay. The arrival demonstrates an abstract inspection concept, labeled “System visualization.” Real operational telemetry appears only from the existing APIs after the user enters the workspace. Reversing the arrival never undoes a real policy change.

## Camera and timeline ledger

Use a C1-continuous position spline and authored look-target spline, zero camera roll. GSAP controls scalar progress; one render loop samples transforms. Do not independently tween the same camera from multiple owners.

| Chapter | Global p | Camera start → end (x,y,z) | Look target / FOV | Pace and key cue |
|---|---|---|---|---|
| 01 Awakening | 0.00–0.16 | (14,9,24) → (12,8,21) | (1,5,0); 38° | Structure assembles inside fixed silhouette |
| 02 Descent | 0.16–0.34 | (12,8,21) → (5,4.5,10) | (1.4,3,1); 38→40° | Beveled fins cross foreground; forward acceleration then deceleration |
| 03 Impact | 0.34–0.50 | (5,4.5,10) → (4.2,3.7,7) | P; 40→36° | Probe contact at p=.405; camera holds during consequence |
| 04 Activation | 0.50–0.64 | (4.2,3.7,7) → (2.6,3.3,5) | (1.4,3,-2); 36° | Inlays illuminate from plate toward seam |
| 05 Transformation | 0.64–0.86 | (2.6,3.3,5) → (8,10,-15) | (1,1,-18); 36→40° | Pass seam at (1.4,3,-1), lift above service terraces |
| 06 Command | 0.86–1.00 | (8,10,-15) → (9,12,-12) | (0,0,-20); 40→34° | Settles to network overview; DOM instrument plane takes priority |

Transformation uses intermediate checkpoint (1.4,3,-1) at p=.71, then (3,6,-9) at p=.78 so the curve cannot cut through the gate. Validate the camera envelope against authored collision proxies; minimum 0.35 m clearance. No camera shake; impact is conveyed by objects and light. Finish each chapter with a clean held composition, not continuous drift.

## 01 — AWAKENING

**Composition.** At 1440×900 the structure occupies x=700–1320, y=150–780; left copy starts at (64,235), max width 570. Title: “See the system. / Follow the evidence.” One active CTA below at y≈560. The brand is modest; scale comes from architecture.

**Depth.** Foreground: 3–5 soft-edged fragments at the far right, never behind text. Midground: 24 structural fins, largest 7 m tall. Background: dark back wall with one dim edge reveal; no starfield. The empty seam is the dominant shape.

**Geometry/material/light.** Authored graphite fins with variable thickness and asymmetric setbacks; satin silver receiving plate visible only as a sliver. Broad white key from (-8,14,10), weaker rear rim from (7,10,-6). Roughness 0.48–0.65; no mirror chrome. Fine particulate mass follows sampled fin surfaces, not a face or sphere.

**Simulation.** On visible full-motion arrival, low-speed surface-adjacent drift runs continuously. Cursor forces displace a small local field, impart bounded velocity, then return fragments with damping. Main structural fins remain stable. A subtle fluid velocity layer influences nearby dust; no full-screen haze or water distortion.

**Controls / trigger.** Scroll p=0–.16 aligns fragments into their authored rest pose. Pointer movement gives localized response only outside interactive DOM. Pause motion stops ambient drift. Enter command center remains a native link.

**Typography / exit.** Headline and short premise remain readable through p=.12; they then fade without deforming. At .16 the empty seam becomes the next target. Typographic motion never moves controls.

**Fallback.** Static approved hero poster and identical text; six linked chapter summaries. Zero particles on low/no-WebGL devices.

## 02 — DESCENT

**Composition.** Camera lowers and travels diagonally toward the seam; one foreground fin crosses the right edge, a second establishes left-midground depth. The seam stays on the right third until p=.28, then approaches center. At least 30% of frame remains calm for text.

**Depth/assets.** Foreground bevel with readable thickness; midground inspection plate and recessed signal grooves; background terraces visible through the cut. Requires authored underside geometry and rear surfaces—no billboard panels. Probe appears at (1.4,2.4,5.0), stationary relative to its guide path until approach begins.

**Light/material.** White rim slides across bevels as camera position changes. Recesses remain nearly black. Directional lighting exposes mass; do not animate random light flicker. No colored status cues yet.

**Simulation.** Existing fragment field stretches slightly along the travel direction. Bounded pointer influence decreases to 40% of Awakening. No arbitrary streak tunnel or motion blur over typography.

**Controls / trigger.** Native scroll controls camera along p=.16–.34. Reversing returns to the same fin alignment. Chapter button advances to .34 without requesting backend data.

**Typography / exit.** “At the edge, every decision has a path.” 48–64 px, lower-left, max two lines, visible .21–.29. It exits before probe contact. Camera decelerates into the Impact shot.

**Fallback.** Two authored viewpoints with a short opacity blend; reduced-motion mode uses a hard cut and text in normal flow.

## 03 — IMPACT

**Composition.** Inspection plate occupies lower-right quadrant; probe approaches along -Z from (1.4,2.4,5.0) to (1.4,2.4,1.6), with its nose meeting plate P at p=.405. Camera is offset to show contact, not head-on. Keep the contact point visible in all supported crops.

**Depth/assets.** Foreground: eight larger graphite fragments; midground: probe, plate and 48–96 small bevelled fragments; background: fixed gateway ribs. Probe is an original flattened hexagonal instrument with one recessed lens slot, no spacecraft silhouette.

**Light/material.** A localized white contact glint, 0.8→1.2 exposure-equivalent range without full-screen flash. Energy reads through plate deformation and occlusion. Graphite remains rough; only the receiving plate responds like a tensioned surface.

**Simulation/consequence.** Probe decelerates before contact. A bounded displacement front travels across the plate; nearby fragments rise 0.15–0.7 m, drift radially 0.1–0.5 m, rotate 8–35°, and settle. Use baked collision-informed transforms for hero debris; evaluate every transform by p. Fine dust uses seeded analytic impulses. A small fluid field adds local shear around the plate but is not the source of the narrative event.

**Controls / trigger.** Contact is a pose at p=.405, not a one-time event callback. Forward and backward scrolling evaluate the same authored wave/debris tracks. Pointer input cannot move the probe or trigger a security decision. A label says “Illustrative inspection sequence.”

**Typography / exit.** “Inspect before passage.” Small chapter label at upper-left; large type is absent at contact. Consequence occupies .405–.47, then settles toward Activation. No arbitrary time lock to force viewers to watch.

**Fallback.** Three contact-sheet states: approach/contact/settled. On reduced motion show settled frame with a sentence explaining displacement. No flash, shake or particle burst.

## 04 — ACTIVATION

**Composition.** Camera draws closer; one lime seam appears inside the graphite structure, while cyan channels run laterally to service terraces. The surrounding mass remains monochrome. Main seam stays vertical and slightly right of center.

**Depth/assets.** Foreground settled fragments; midground interlocking gate fins with authored open/closed transforms; background physical conduits. Use actual mesh recesses for major channels; emissive textures for fine detail.

**Light/material.** White contact glint recedes. Lime inlay activates from bottom to top; cyan edge light follows existing grooves. Emissive contribution is restrained, with a baked or approximated local spill. No rainbow shift or overall green wash.

**Simulation.** Dust aligns gently to the path field. Impact fluid energy decays; no new impulse. Fins separate 0.2–0.45 m along authored hinges/slides to reveal the passage. Mechanical limits remain visible.

**Controls / trigger.** Progress .50–.64 maps activation and opening; reverse closes the illustrative gate. “Activation” never changes backend `enabled`. Actual policy state is shown later in Secure Gateway as text.

**Typography / exit.** “A visible path. / An accountable decision.” 48–64 px to the left, with small subtitle “Concept visualization · operational decisions come from recorded evidence.” At .62 typography fades and the seam frames the next shot.

**Fallback.** Single illuminated keyframe; optional 150 ms crossfade from monochrome. Status has no reliance on lighting.

## 05 — TRANSFORMATION

**Composition.** Camera passes the narrow cut once, then emerges into an open stepped landscape of service terraces. It rises to reveal hierarchy. This is a finite threshold crossing, not an endless tunnel. Far wall and floor horizon anchor the space.

**Depth/assets.** Foreground gate ribs occlude then leave frame; midground three deliberately different service terrace silhouettes; background recessed plane and sparse connectors. Arrival uses an abstract, explicitly illustrative arrangement with no fake service names/counts. Operational Risk later binds the same reusable kit to real services.

**Light/material.** Cyan path inlays lead the eye. Silver caps identify terrace boundaries. Soft overhead key restores readable neutral materials. No depth-of-field on labels; scene fog is negligible by the end.

**Simulation.** Particles reduce to 25% count by p=.78 and zero by .86. Ambient field speed decays to zero. Gate debris is settled and leaves view. Camera inertia is controlled by progress smoothing, not independent physics.

**Controls / trigger.** Scroll .64–.86 traverses the waypoints. The persistent Enter link bypasses remaining travel. A chapter summary remains in DOM for keyboard/screen-reader use.

**Typography / exit.** “From structure to understanding.” Brief lower-left phrase; fades by .80. Thin HTML guides align with the scene's dominant axis but display no unverified metrics. The final framing matches the Command preview footprint.

**Fallback.** Cut from gateway to authored terrace overview poster. No video scrubbing required. Mobile uses separate image composition rather than a center crop.

## 06 — COMMAND

**Composition.** World contracts visually into a bounded top-right illustration; a clear DOM Command preview occupies the foreground. Left: “Your system, in view.” Right: direct links to Gateway, Risk and Investigation. This preview states “Open workspace to load recorded telemetry” and shows no mock operational values.

**Depth/assets.** Gateway edge remains as a faint framing silhouette, service terraces settle behind the instrument panel; no decorative elements overlap controls. On actual `/command-center`, canvas becomes dormant/absent and the operational shell loads independently.

**Light/material/simulation.** Neutral lighting, no continuous motion, no fluid pass. At p=.94 the camera is fixed; between .94–1 only DOM emphasis changes. No spinning model while reading.

**Controls / trigger.** Arrival completion does not force navigation. “Enter command center” explicitly navigates to `/command-center`, mounts the shared polling provider, and renders the real shell immediately. Gateway/Risk deep links can enter those routes directly. This explicit handoff preserves reverse scrolling until navigation; browser Back restores home chapter/scroll position without replaying the intro.

**Typography / transition.** 44–56 px title resolves to the operational 36–44 px scale. Shell entry is a 160–220 ms opacity/8 px translation, never a blocking camera flight. Once the workspace route opens, the Command Center is fully interactive; data regions can be loading while navigation is already usable.

**Fallback.** Identical DOM preview and route behavior. No visual dependency can prevent access to data.

## Continuity and storyboard review

Produce six labeled stills at exact chapter endpoints plus contact at .405. Each records camera/FOV, crop, lighting preset and asset version. Test a reverse pass .86→.34→.64, arbitrary seek .10→.81, viewport resize at .405, reduced-motion toggle at .71, and route exit while assets are loading. Deterministic story poses must match within the tolerances in DESIGN_ACCEPTANCE.md. Pointer residue is a bounded secondary layer and is reset on seeks/reversals; it cannot displace narrative landmarks.

Desktop and mobile composition reviews are separate. For 390×844, keep the seam/probe within the middle 60% of image width, reserve a separate text block below, and use no overlay headline over detailed geometry. At 200% zoom the document expands; the animation must never trap focus or require hidden controls.
