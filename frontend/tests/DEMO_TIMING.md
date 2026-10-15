# Recorded demonstration timing audit

At the default 1× speed, the real presentation controller uses 6 / 6 / 6 /
9 / 9 / 8 seconds for Request, Observation, Traffic recording, Security
analysis, Finding and Risk explanation. Evidence has no scheduled transition.
These are presentation durations, not measured backend processing times.

Pause preserves the current stage's remaining time. Resume consumes that
remaining time. Previous, Next, arrow keys and timeline selection cancel the
automatic timer immediately and enter manual exploration. Resume from a
manually selected stage gives that stage its full duration. Changing speed
rescales the remaining presentation time without resuming paused playback.
Replay uses the already returned result; only Run controlled scenario sends
a backend execution request. Exit and unmount cancel pending playback.
Reduced-motion preferences default to manual exploration.

## Regression tests

From `frontend`, run `npm test`, `npm run typecheck`, and `npm run build`.
`demo-playback.test.mjs` uses a fake monotonic clock, including deliberately
invoking a canceled callback to test the manual-navigation race.

## Browser clock (no database writes)

Start the existing Vite development server with `npm run dev -- --host
127.0.0.1`, then open `/tests/demo-timing.html` at its reported port. This
development-only harness renders the actual WatchHyperionWork component in
React StrictMode. Its labeled fixture adapts existing recorded evidence
#838 / alert #11; it is not a fresh execution. A local fetch stub returns the
fixture after two seconds. No request is sent to the backend. The harness is
not an entry point in the production build.

Check consent, then Run. During the two-second delay there must be no stage
content or stage signal. The observation table records `performance.now()`
when the actual stage DOM changes. Leave playback untouched at 1× for the
full 44-second sequence, then check that Evidence stays open. Ordinary
browser scheduling can delay a transition slightly; it must not shorten the
configured interval. Background tabs may be throttled by the browser.

Test Pause/Resume, manual Next/Previous, stage selection, speed, Replay and
Exit using the real controls. Replay must not increment Fixture response
count. Do not use a real Run just to verify animation timing: that operation
intentionally appends backend records.
