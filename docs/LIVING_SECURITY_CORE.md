# Hyperion — Living Security Core: Implementation Note

## 1. Overview & Creative Vision
* **Core Philosophy**: "Every API leaves a signal. See the request. Understand the risk. Follow the evidence."
* The signature intertwined emerald loop identity is transformed from a decorative ambient sculpture into a living, responsive security-analysis visualization that grounds the user experience in the actual FastAPI security engine.
* **Scope**: Delivers one complete, end-to-end BOLA (Broken Object-Level Authorization) demonstration connecting real backend capture to geometry-following visual signals and forensic investigation links.

---

## 2. Animation & 3D Loop Geometry Architecture
* **Centerline Tracking**:
  * The geometry uses the parametric curve defined in [`frontend/src/graphics/environment.ts`](file:///c:/Users/anime/Documents/Hyperion-GitHub/frontend/src/graphics/environment.ts):
    $$r(u) = 1.1 + 0.38\cos(3u + 0.08\sin(0.2t))$$
    $$P(u) = \big(r\cos(2u),\, r\sin(2u),\, 0.56\sin(3u)\big)$$
  * The vertex shader passes the parametric coordinate `aParam.x` as `vArc` directly into the fragment shader.
* **Traveling Light Signal**:
  * Calculates circular geodesic arc distance on the closed loop:
    $$\Delta u = \min(|vArc - uDemoArc|,\, 2\pi - |vArc - uDemoArc|)$$
  * An intense exponential head ($\Delta u < 0.12$) is followed by an asymmetric directional fading trail extending backward along the path:
    $$d_{\text{trail}} = \text{mod}(uDemoArc - vArc + 2\pi,\, 2\pi)$$
    $$\text{Trail} = \exp(-d_{\text{trail}} / 0.28) \times (1 - \text{smoothstep}(0, 0.72, d_{\text{trail}}))$$
* **Breach Illumination**:
  * When a BOLA breach is confirmed by the engine (`uDemoFinding > 0.5`), the vulnerability sector (around $u = 4.45$) illuminates with a restrained coral/amber radiant bloom (`vec3(1.0, 0.34, 0.18)`), breathing gently to signal active risk.
* **Spatial Continuity Transition**:
  * On navigating to "Watch Hyperion Work" (`/watch`), `html[data-route="watch"]` smoothly translates the WebGL canvas to the left half of the viewport (`transform: translateX(-36vw) scale(0.92)`) over 750ms with a `cubic-bezier(0.16, 1, 0.3, 1)` easing curve.
  * The demonstration narrative unrolls gracefully on the right half, keeping the visual identity and explanation in one coherent scene.

---

## 3. Story State Machine & Lifecycle
* **Deterministic Visual States**:
  1. `IDLE`: Ambient rotation and quiet emerald pulse along the parametric curve. No claim of live traffic.
  2. `READY`: User chooses scenario (BOLA default); briefing scenario appears with explicit authorization consent.
  3. `EXECUTING`: Dispatches controlled request to local test API; pulse accelerates and enters the loop.
  4. `ANALYZING`: Pulse enters the evaluation sector ($u \approx 3.5$); tone shifts to warning amber.
  5. `FINDING`: BOLA ownership detector triggers with CRITICAL severity; breach sector flashes coral.
  6. `RISK`: Dynamic recalculation updates endpoint score to 55/100 (active BOLA +30).
  7. `EVIDENCE`: Real alert ID `#1` and traffic ID `#2` are bound; direct link to `/command-center/investigation` is revealed.
* **Replay Without Mutation**:
  * Clicking "Replay recorded stages" replays the verified 7-stage walkthrough in memory from stored results. It **never** dispatches redundant HTTP attacks or mutates the database.

---

## 4. Backend Demonstration Integration
* **Endpoint**: `POST /api/governance/demo/run` with payload `{"scenario": "bola", "authorized": true}`.
* **Target Route**: `GET /api/v1/users/user_202` with header `X-User-Id: user_101`.
* **Execution Boundary**:
  * Restricted strictly to localhost (`127.0.0.1`, `::1`, `testclient`).
  * Controlled via an asyncio mutex lock to prevent concurrent collisions.
  * Uses isolated benchmark IP prefixes (`198.18.*.*`) to avoid corrupting historical baseline data.
  * In the vulnerable case, server returns `HTTP 200` to non-owner; `BOLADetector` intercepts the response and generates a genuine persisted finding.

---

## 5. Distinction: Demo versus Live Data
* The Living Security Core is explicitly labeled as a **Controlled Demonstration**.
* Ambient loop motion alone is never claimed to be live incoming traffic.
* If the backend server is unreachable or reports an error, execution stops immediately and shows the true backend failure message; it never fabricates an artificial success sequence.

---

## 6. Accessibility & Performance Decisions
* **Respects Motion Preferences**:
  * When `prefers-reduced-motion: reduce` or `data-visual-motion="reduced"` is active, continuous WebGL animation is paused, rendering a single static frame without continuous requestAnimationFrame loops.
  * Interactive stage switches execute instantaneously without motion delays.
* **Keyboard Navigation**:
  * The 7 confirmed stages can be navigated with `ArrowLeft` and `ArrowRight` keys.
  * All action links and consent controls are fully tab-accessible with high-contrast emerald focus outlines.
* **GPU & CPU Efficiency**:
  * Single WebGL canvas retained across route transitions.
  * Native GLSL shaders execute all vertex and fragment calculations; zero React state updates per frame.
  * Device pixel ratio capped at 1.5 on desktop and 1.0 on mobile to eliminate overdraw and battery drain.

---

## 7. Remaining Limitations & Future Scenarios
* Scraping and Token Misuse animations are deliberately deferred to subsequent milestones.
* Multi-user real-time collaborative investigation traces are out of scope for this single-endpoint BOLA demonstration.
