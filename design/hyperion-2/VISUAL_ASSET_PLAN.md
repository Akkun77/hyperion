# VISUAL ASSET PLAN

HYPERION 2.0 · authored scene and local delivery · 27 October 2026

## Art package and first deliverable

**First asset: Inspection Array hero keyframe.** Model and light an original asymmetric gateway in Blender, then render approved stills at 1440×900 and 390×844 before animation work. The desktop still must show two unequal banks of thick graphite fins, a readable off-center seam, real recess depth, a small satin-silver probe and large quiet space for left-aligned HTML type. Mobile needs a separate camera/crop, not a center cut of desktop. Produce a grayscale version before any cyan/lime. Review silhouette at thumbnail size, bevel readability, contact shadows, text clearance and color restraint. This is the first implementation milestone.

World dimensions, P=(1.4,2.4,1.2), six camera checkpoints and p=.405 contact are specified in `EXPERIENCE_STORYBOARD.md`. Block geometry to those coordinates, then export named scene cameras. Never substitute a particle tunnel, wireframe sphere, glowing loop or flat floating cards for the still.

## Authored asset inventory

| Asset | Authoring/export | Required design evidence | Runtime role |
|---|---|---|---|
| `inspection_array` | Blender GLB: 24 nonidentical load-bearing fins in two unequal banks, true side/back faces, bevels, inset grooves and offset plinth | Orthographic front/side, silhouette thumbnail, hero desktop/mobile stills | Arrival and Gateway shared structure |
| `receiving_plate` | GLB with plate surface, recessed contact cavity and a few controlled displacement targets | Neutral close-up and p=.405 contact frame | Probe impact; no broad plane shader shortcut |
| `inspection_probe` | Original 0.7 m flattened hexagonal instrument with inset lens slot and visible mass | Three-quarter turnaround; nose/plate alignment | Arrival contact; not a spacecraft or character |
| `gate_mechanism` | Authored hinges/slides/end stops for major fins, animation tracks or named transforms | Closed, half-open, open contact sheets | Activation; illustrative only, not backend policy |
| `debris_set` | 8 hero fragments and 48–96 small varied bevelled pieces, shared low-count material set | Rise/settle frames and occlusion check | Deterministic impact consequence |
| `service_terraces` | Modular GLB kit: three distinct terrace silhouettes, cap, channel and slot modules | Top/oblique views with 1/4/12 services | Transformation and Risk atlas; positions bound to real hierarchy |
| `channel_inlays` | Thin recessed mesh paths plus emissive masks; split neutral/cyan/lime variants | Activation progression at p=.50/.57/.64 | Visual path, never a fake observed packet |
| `backplane` | Large matte back wall/floor with actual seams and shadow receivers | Unlit/neutral render to show spatial depth | Finite environment/horizon |
| `split_h_mark` | Original SVG/vector, legible at 16/24/48 px | Black/white/paper proofs | Brand and favicon; no old loop |
| `scene_posters` | Approved lossless-source stills exported to optimized WebP/AVIF, one per chapter plus contact, desktop/mobile | Six-chapter contact sheet, motion-off QA | Loading, low capability, reduced motion |

Source `.blend` and large working textures belong in `design/hyperion-2/assets/source/` when implementation begins; runtime GLBs/maps/posters in `frontend/public/hyperion-2/`. Neither asset tree is created in this planning stage. Each export has a manifest entry: asset name, source author, license, version, scale, intended scene, texture channels, triangle count, compressed bytes and fallback poster. No third-party Lusion assets or extracted shaders.

## Materials and lighting

Graphite: charcoal-neutral, roughness 0.48–0.65, metalness 0.15–0.30, subtle directional grain through authored normal maps. Silver: satin #C8D0D2, roughness 0.25–0.38, metalness 0.65–0.82; do not turn it into mirrored chrome. Ceramic end caps: cool neutral, roughness 0.55–0.7. Recesses absorb light; inlays emit only within modeled channels. Tonemap against actual HTML palette. Cyan/lime occupy <8% of hero pixels and no more than 5% of a typical instrument view. Avoid full-scene green fog and wide bloom.

Key: broad white source from upper-left; fill: 15–25% of key intensity; rear edge: narrow cool neutral to separate far fins. Bake or approximate contact shadows and ambient occlusion in lower tiers. Impact glint stays localized to plate, no full-frame flash. Activation introduces lime inside the seam and cyan on path branches; dark structure remains dark. At Command, lights settle and frame becomes neutral. Produce a clay render and lighting-only review before color material approval.

Texture plan: packed ORM where useful; KTX2/Basis for albedo/normal/roughness after comparison; 1k major material maps, 512 px minor, up to 2k only for demonstrable close-ups. UV padding and tangent consistency need visual QA at all camera checkpoints. No photographic stock textures required. Use a small authored HDR environment or baked light probes only if it improves bevels without inflating transfer/fill cost.

## Effects produced in code

Use instanced fine fragments seeded by fin surface coordinates; initial target 12k points at high, 4k medium, 1k low. Their rest positions are stable and deterministic. Pointer velocity field is local and capped; a spring-damper returns displaced fragments. A small GPU velocity texture may add shear near pointer/contact at 256² high, 128² medium and disabled low. It never contains security data and never covers readable text. Hero debris follows baked transforms for reversible scroll. Path illumination can be a uniform along pre-authored inlays. HTML/CSS owns all type, badges, forms, tables, focus, headers, chart text and labels. Do not bake words or changing values into 3D textures.

Avoid a general particle-physics engine, procedural terrain, volumetric fog across the whole scene, pseudo-live packet streams and expensive per-pixel full-screen blur. A pre-rendered video is optional for an explicitly user-played reel only; it cannot replace the interactive/predictable six-chapter sequence or the accessible fallback.

## Image-generation briefs, optional concept support

Image generation may explore mood but outputs are **not** final geometry, telemetry or proprietary-reference reconstruction. Brief A: “Original asymmetric industrial inspection gantry, unequal graphite slabs around an oblique vertical cut, satin metal probe at small scale, deep recesses, broad cold key light, black negative space to the left, cinematic architectural photography, no ring, no humanoid, no logo.” Brief B: “Close-up material study of machined graphite and satin silver plate, tiny recessed cyan/lime lines, precise bevel and contact shadow, neutral black background, no text or dashboard.” Brief C: “Open stepped service terraces behind an industrial gate, limited cyan wayfinding, massive physical scale, dark matte architecture, no tunnel or floating UI.” Generated images are concept boards only; the Blender keyframe and posters must be authored/reviewed independently.

## Export, quality and acceptance

Use one scale convention (meters, Y-up in engine after export validation), named pivots for each moving part and separated material slots. Verify probe nose reaches plate without penetration, gates have mechanical stops, rear faces exist and camera path clears structure by ≥0.35 m. Build LOD/instanced variants and decimate hidden geometry before export. Test compressed GLB and KTX2 with local decoders; preserve a poster when WebGL is absent. Proposed high ceiling: 250k visible triangles, 120 draw calls, 12k dust points, DPR≤1.5; medium 120k/80/4k/DPR≤1.25; low 60k/45/1k/DPR≤1. Numbers are caps to validate, not visual targets. Scene startup must not block HTML navigation. See FRONTEND_ARCHITECTURE.md for lifecycle and DESIGN_ACCEPTANCE.md for screenshot gates.
