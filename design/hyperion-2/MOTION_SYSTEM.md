# MOTION SYSTEM

HYPERION 2.0 · one motion vocabulary · 27 October 2026

## Principle and ownership

Motion communicates inspection, physical consequence and navigation state. The authored arrival is the only sustained cinematic sequence. In the instrument, motion becomes brief evidence of selection or change and then rests. One scene director owns camera and object poses; one DOM transition coordinator owns page reveals. React stores semantic selections, not per-frame positions. The six progress intervals and camera checkpoints are defined in `EXPERIENCE_STORYBOARD.md` and must be reused, not re-authored here.

## Timing and easing

| Category | Duration / behavior | Easing / limit |
|---|---|---|
| Hover/focus feedback | 90–140 ms | ease-out; ≤2 px displacement; focus never waits |
| Press/toggle/checkbox | 100–160 ms | ease-out; state and label update immediately |
| Category underline/filter result | 160–220 ms | cubic-bezier(.22,.8,.25,1); no row flight |
| Workspace route entry | 160–220 ms | opacity + 8 px translation; cancellable; no delayed route commit |
| Detail panel/modal | 180–260 ms | decelerate on entry, faster on exit; focus/scroll fixed |
| Atlas camera selection | 350–500 ms | smoothstep-like accelerate/decelerate; no roll, overshoot or more than one active target |
| Object impact/debris | progress-linked .405–.47 of arrival | authored impulse, rise, drag and settle; deterministic when seeking backward |
| Text reveal | 220–420 ms per phrase | opacity and ≤12 px translation; no letter-splitting for essential text |
| Poster→scene | ≤180 ms after minimum assets ready | crossfade with matched composition; no black flash |
| New observed-signal accent | ≤700 ms, once per bounded poll batch | brief cyan/semantic accent; only for new records from `liveSignal.ts` |

The main scroll position maps to normalized p∈[0,1]. Evaluate camera, look target, FOV, geometry, light, probe, debris, particle envelope and copy visibility as pure functions of p. Scroll direction changes evaluation order only; it does not trigger a one-way event. Asset loads cannot change p. No wheel interception, forced snap, parallax that displaces controls, or time-based animation needed to reach a chapter endpoint.

## Physical response

Pointer influence is local to the arrival canvas and absent over buttons, text or the operational shell. Normalize pointer to ray/scene hit; radius 0.8–1.4 m, maximum particle displacement 0.35 m. Clamp pointer velocity to 2 m/s equivalent before applying force. Use a spring-damper for the secondary field (`a = k(rest-pos) - c*velocity + pointerForce`), integrate with fixed ≤16.7 ms substeps and cap accumulated delta at 50 ms. Tune k/c to settle to <5% displacement within 1.2 s after pointer stops. This is an implementation starting point, not a claim about the reference. Scene landmarks and probe contact remain on authored tracks regardless of cursor motion.

Impact is a pose at p=.405. Main debris and plate displacement are baked or parameterized by progress so forward/reverse seeking is identical. Fine dust gets seeded analytic impulse curves. Object collision proxies are used during asset blocking to guarantee the camera misses geometry by ≥0.35 m; there is no runtime rigid-body dependency. The localized fluid field is a secondary velocity texture around the plate and pointer. It does not drive the narrative or distort labels. Disable it on low quality, reduced motion and operational pages.

Camera follows the storyboard spline without roll. Avoid abrupt FOV shifts, shake or acceleration changes at chapter boundaries. The operator can click any chapter label to seek directly; a new seek cancels the previous camera tween. User-driven atlas selection uses a separate bounded camera rig after the arrival, with stable viewpoints and Reset view. Do not map live risk score to camera height or physical size.

## Category and page transitions

Navigation indicator and heading can move; table rows do not. Route data mounts immediately. Exit choreography may overlap entry but cannot hide content for more than 220 ms. A newer route cancels older transitions and wins. The active route heading receives focus after transition start, never after a long animation. Browser Back restores prior selection and scroll.

Finding categories: indicator slides, list crossfades ≤160 ms, selection survives if still in result. Changing Traffic filters keeps old rows only with Previous query and timestamp until new response arrives; a loader is not a license to show mismatched data. Risk hierarchy expands in place with measured height, then rests. Investigation switches evidence with ≤180 ms opacity while preserving ID and screen-reader announcement. Dialogs open as DOM layers, trap focus where modal and restore focus on close. No background camera motion while a dialog is open.

Typography is HTML/CSS. Phrase reveals follow chapter progress, with no scramble, typewriter or high-frequency glyph rain. Severe findings do not flash. ALLOW/FLAG/BLOCK always appear as text plus icon/shape, not a color transition alone.

## Run-state matrix

| Context | Continuous | On interaction/new data | Paused or absent |
|---|---|---|---|
| Arrival visible, full quality | Surface-adjacent dust at low speed, only while in view | Pointer displacement, progress evaluation, local impact fluid | Backend signal pulses; offscreen render |
| Gateway open | None after camera settles | Selected recorded-path illustration; one policy-response state change | Fluid, ambient particles, route-independent movement |
| Risk atlas open | None after selection settles | Camera to selected service, expansion, focus | Background pulses and large particle field |
| Overview/Traffic/Inventory/Findings/Flow/Investigation/Connect | None | Brief DOM focus/selection/actual new-observation accent | Canvas and all continuous effects |
| Watch | Presentation clock only when Play selected | Stage reveal from completed response | Backend calls during Replay presentation |
| Hidden tab/context lost | None | Resume from current p or show fallback after recovery | Accumulated delta catch-up and new animation from historical records |

## Accessibility and user controls

`prefers-reduced-motion: reduce` defaults to Still; an explicit preference can lower but never override a system reduce setting upward. Still uses the approved six posters, immediate content, no particle/fluid/animated camera and ≤100 ms opacity if any. Light disables fluid, cuts particles ≥75%, caps 30 FPS and reduces Bloom to zero. Full is adaptive, not a promise of maximum quality. A Pause control freezes ambient motion without freezing native scroll, input, data refresh or screen readers. Device touch does not synthesize hover/pointer force.

Preserve DOM order at all times; animation must not reorder reading order. Announce meaningful new evidence once per bounded batch, with a visible count and a user-controlled way to inspect it. Avoid vestibular triggers: no camera roll, shake, full-screen zoom pulse, rapid strobe, large background drift while reading or uncontrolled auto-scroll. Test a 200% zoom and keyboard-only journey in every mode.

## Verification gate

At fixed p checkpoints, forward and reverse screenshots must agree in camera/geometry within 2 px at 1440×900 after pointer field settles. Seek .10→.81→.405 repeatedly without duplicate impulses. Leave route during tween/load and verify no delayed scene mutation. Hide tab for 60 s; resume without a jump. Data-only routes should have zero animation frames once their brief DOM transition ends.
