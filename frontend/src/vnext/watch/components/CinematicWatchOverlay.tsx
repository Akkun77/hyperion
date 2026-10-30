import { useState } from 'react';
import { Link } from '../../../router';
import { HyperionEmblem } from '../../../components/HyperionLogo';
import { NetworkScenario } from '../types';
import { DecisionMode } from '../scene/CinematicWatchWorld';

interface CinematicWatchOverlayProps {
  progress: number;
  isPlaying: boolean;
  decisionMode: DecisionMode;
  scenario: NetworkScenario;
  scenarios: NetworkScenario[];
  signalPos: { x: number; y: number } | null;
  isBackendOnline: boolean;
  onProgressChange?: (p: number) => void;
  onTogglePlay: () => void;
  onReplay: () => void;
  onStep: (direction: number) => void;
  onSelectScenario: (scenario: NetworkScenario) => void;
  onSelectDecisionMode: (mode: DecisionMode) => void;
}

export function CinematicWatchOverlay({
  progress,
  isPlaying,
  decisionMode,
  scenario,
  scenarios,
  signalPos,
  onProgressChange: _onProgressChange,
  onTogglePlay,
  onReplay,
  onStep,
  onSelectScenario,
  onSelectDecisionMode,
}: CinematicWatchOverlayProps) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // 7-Stage Contextual Narration definitions
  // Provides clear, human-readable museum exhibition subtitles explaining each stage in real time
  let stageTag = '01 // INGRESS';
  let stageHeading = '01 — REQUEST RECEIVED';
  let stageSentence = 'A client sends an HTTP request toward the security gateway.';
  let stageContext = `${scenario.method} ${scenario.path}`;

  if (progress < 0.16) {
    stageTag = '01 // INGRESS';
    stageHeading = '01 — REQUEST RECEIVED';
    stageSentence = 'A client sends an HTTP request toward the security gateway.';
    stageContext = `${scenario.method} ${scenario.path} · Origin: ${scenario.clientGeo}`;
  } else if (progress < 0.33) {
    stageTag = '02 // ROUTE';
    stageHeading = '02 — ROUTE EVALUATED';
    stageSentence = 'The gateway matches the request to a route and examines the applicable policy.';
    stageContext = `Transit to :8000 · Ingress conduit`;
  } else if (progress < 0.50) {
    stageTag = '03 // POLICY';
    stageHeading = '03 — POLICY CHECK';
    stageSentence = 'The request is checked against configured security rules and invariants.';
    stageContext = `Evaluating: ${scenario.policyRule}`;
  } else if (progress < 0.68) {
    stageTag = '04 // DECISION';
    stageHeading = '04 — DECISION';
    if (decisionMode === 'ALLOW') {
      stageSentence = 'The gateway decides to forward the request through the aperture into the upstream egress corridor.';
      stageContext = 'Verdict: ALLOW · Route verified';
    } else if (decisionMode === 'FLAG') {
      stageSentence = 'The gateway flags the anomalous request for audit, splitting a forensic trace to the evidence ledger.';
      stageContext = 'Verdict: FLAG · Audit recorded';
    } else {
      stageSentence = 'The gateway stops the request at the perimeter. The connection is terminated immediately.';
      stageContext = 'Verdict: BLOCK · Intercepted at gateway';
    }
  } else if (progress < 0.85) {
    stageTag = '05 // UPSTREAM';
    stageHeading = '05 — UPSTREAM';
    if (decisionMode === 'BLOCK') {
      stageSentence = 'Traffic is isolated from the citadel. A blocked request never reaches protected internal services.';
      stageContext = 'HTTP 429 · Upstream unreached';
    } else {
      stageSentence = 'An allowed request reaches the protected API citadel and receives a valid response.';
      stageContext = `Citadel returned ${scenario.statusCode} ${scenario.statusText}`;
    }
  } else if (progress < 0.95) {
    stageTag = '06 // EVIDENCE';
    stageHeading = '06 — EVIDENCE RECORDED';
    stageSentence = 'The request, decision metadata, and cryptographic fingerprint are recorded for forensic investigation.';
    stageContext = `SHA-256: ${scenario.evidenceHash.slice(0, 24)}...`;
  } else {
    stageTag = '07 // INVESTIGATION';
    stageHeading = '07 — INVESTIGATION';
    stageSentence = 'Follow the recorded event, policy telemetry, and related security findings into the Command Center.';
    stageContext = 'Ready for investigation desk';
  }

  // Accent color for current verdict
  const verdictColor =
    decisionMode === 'ALLOW'
      ? 'var(--allow)'
      : decisionMode === 'FLAG'
      ? 'var(--flag)'
      : 'var(--block)';

  return (
    <div className="cinematic-watch-overlay-root">
      {/* --------------------------------------------------------------------
          TOP NAVIGATION HEADER
          Quiet obsidian frosted bar, non-overlapping, strictly responsive
          -------------------------------------------------------------------- */}
      <header className="watch-top-header" role="banner">
        <div className="watch-brand-col">
          <Link href="/" className="watch-brand-link" aria-label="Hyperion Home">
            <span className="watch-brand-symbol">
              <HyperionEmblem size={20} />
            </span>
            <div className="watch-brand-titles">
              <span className="watch-brand-title">HYPERION</span>
              <span className="watch-brand-sub">GATEWAY OBSERVATORY</span>
            </div>
          </Link>
        </div>

        <div className="watch-header-actions">
          <Link href="/" className="watch-nav-link" title="Return to Fractured Veil Hero">
            ← Homepage
          </Link>
          <Link href="/watch" className="watch-nav-link active" title="Watch Hyperion Work">
            Watch
          </Link>
          <Link href="/command-center" className="watch-btn-command-center" title="Open Operational Command Center">
            Open Command Center <span className="arrow-glyph">→</span>
          </Link>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          CONTEXTUAL STAGE NARRATION
          Cinematic museum-grade stage narration in protected upper-left void.
          Explains the observable 3D event with crisp typography and subtle hairline.
          -------------------------------------------------------------------- */}
      <div className="watch-stage-narration" role="region" aria-label="Current Stage Explanation">
        <div className="narration-hairline" style={{ backgroundColor: verdictColor }} />
        <div className="narration-content">
          <div className="narration-stage-header">
            <span className="narration-dot" style={{ backgroundColor: verdictColor }} />
            <span className="narration-stage-tag">{stageTag}</span>
          </div>
          <h2 className="narration-heading">{stageHeading}</h2>
          <p className="narration-sentence">{stageSentence}</p>
          <div className="narration-context-row">
            <span className="narration-pill mono">{stageContext}</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          FLOATING 3D REQUEST PROTAGONIST TAG
          Directly follows the traveling 3D request entity
          -------------------------------------------------------------------- */}
      {signalPos && (
        <div
          className="watch-floating-signal-tag"
          style={{
            transform: `translate3d(${Math.max(20, Math.min(window.innerWidth - 240, signalPos.x - 70))}px, ${Math.max(80, Math.min(window.innerHeight - 180, signalPos.y - 55))}px, 0)`,
          }}
          aria-hidden="true"
        >
          <div className="signal-tag-body">
            <span className={`signal-method-badge method-${scenario.method.toLowerCase()}`}>
              {scenario.method}
            </span>
            <span className="signal-path-label">{scenario.path}</span>
            <span
              className="signal-decision-pip"
              style={{ backgroundColor: verdictColor, boxShadow: `0 0 8px ${verdictColor}` }}
            />
          </div>
          <div className="signal-tag-meta">
            <span>{stageTag}</span>
            <span>+{scenario.latencyMs}ms</span>
          </div>
          <div className="signal-tag-pointer-line" />
        </div>
      )}

      {/* --------------------------------------------------------------------
          INSTALLATION HUD: UNDERSTATED BOTTOM CONTROLS
          No media-player toolbars; clean spatial controls
          -------------------------------------------------------------------- */}
      <footer className="watch-installation-footer" role="region" aria-label="Demonstration Controls">
        {/* Left: Scenario Selector */}
        <div className="watch-scenario-selector">
          <span className="scenario-section-label">SELECT SCENARIO</span>
          <div className="scenario-pill-list">
            {scenarios.map((sc) => {
              const isSelected = sc.id === scenario.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  className={`scenario-install-pill ${isSelected ? 'active' : ''} scenario-${sc.decision.toLowerCase()}`}
                  onClick={() => onSelectScenario(sc)}
                >
                  <span className="scenario-dot" />
                  <span className="scenario-name">{sc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Discreet Actions & Technical Dossier */}
        <div className="watch-installation-actions">
          {/* Verdict Override Buttons */}
          <div className="watch-verdict-pills">
            {(['ALLOW', 'FLAG', 'BLOCK'] as DecisionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`decision-override-btn ${mode.toLowerCase()} ${decisionMode === mode ? 'active' : ''}`}
                onClick={() => onSelectDecisionMode(mode)}
                title={`Force verdict to ${mode}`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="watch-btn-discreet"
            onClick={onReplay}
            title="Replay Request Journey"
          >
            ↺ Replay
          </button>

          <button
            type="button"
            className="watch-btn-discreet"
            onClick={() => onStep(-1)}
            title="Step backward"
          >
            ◀
          </button>

          <button
            type="button"
            className="watch-btn-discreet"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause journey' : 'Play journey'}
          >
            {isPlaying ? '❚❚ Pause' : '▶ Play'}
          </button>

          <button
            type="button"
            className="watch-btn-discreet"
            onClick={() => onStep(1)}
            title="Step forward"
          >
            ▶
          </button>

          <button
            type="button"
            className={`watch-btn-dossier ${isInspectorOpen ? 'open' : ''}`}
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title="Toggle Technical Forensic Dossier"
          >
            <span>Technical Dossier</span>
            <span className="toggle-chevron">{isInspectorOpen ? '▼' : '▲'}</span>
          </button>

          <Link href="/command-center" className="watch-btn-inspect-cc" title="Inspect in Command Center">
            Inspect in Command Center <span className="arrow-glyph">→</span>
          </Link>
        </div>

        {/* ------------------------------------------------------------------
            COLLAPSIBLE TECHNICAL INSPECTION DOSSIER
            Lightweight, non-obscuring drawer anchored below
            ------------------------------------------------------------------ */}
        {isInspectorOpen && (
          <div className="watch-technical-dossier" role="region" aria-label="Forensic Technical Dossier">
            <div className="dossier-grid">
              {/* Col 1: Wire Headers */}
              <div className="dossier-col">
                <div className="dossier-col-header">REQUEST WIRE TRACE</div>
                <div className="dossier-metric-row">
                  <span className="dossier-key">METHOD:</span>
                  <span className="dossier-val bold">{scenario.method}</span>
                </div>
                <div className="dossier-metric-row">
                  <span className="dossier-key">PATH:</span>
                  <span className="dossier-val mono">{scenario.path}</span>
                </div>
                <div className="dossier-metric-row">
                  <span className="dossier-key">CLIENT IP:</span>
                  <span className="dossier-val mono">{scenario.clientIp}</span>
                </div>
                <div className="dossier-metric-row">
                  <span className="dossier-key">LOCATION:</span>
                  <span className="dossier-val">{scenario.clientGeo}</span>
                </div>
                <div className="dossier-metric-row">
                  <span className="dossier-key">HTTP RESULT:</span>
                  <span className="dossier-val badge" style={{ color: verdictColor, borderColor: verdictColor }}>
                    {scenario.statusCode} {scenario.statusText}
                  </span>
                </div>
              </div>

              {/* Col 2: Policy Invariant Evaluation */}
              <div className="dossier-col">
                <div className="dossier-col-header">GATEWAY POLICY EVALUATION</div>
                <div className="dossier-policy-box">
                  <span className="dossier-rule-tag">EVALUATED INVARIANT</span>
                  <p className="dossier-rule-text">{scenario.policyRule}</p>
                </div>
                <ul className="dossier-invariants-list">
                  {scenario.invariants.map((inv, idx) => (
                    <li key={idx} className="dossier-invariant-item">
                      <span className="check-mark">✓</span>
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3: Recorded Evidence Ledger */}
              <div className="dossier-col">
                <div className="dossier-col-header">CRYPTOGRAPHIC EVIDENCE SINK</div>
                <div className="dossier-hash-box">
                  <span className="hash-title">FORENSIC SHA-256 HASH:</span>
                  <span className="hash-string mono">{scenario.evidenceHash}</span>
                </div>
                <p className="dossier-explanation">{scenario.description}</p>
                <div className="dossier-deep-link-wrap">
                  <Link href="/command-center" className="dossier-deep-link">
                    Open Record in Command Center →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orientation Status Indicator (Neutral spatial orientation) */}
        <div className="watch-orientation-strip" aria-live="polite">
          <span className="orientation-dot" style={{ backgroundColor: verdictColor }} />
          <span className="orientation-stage">{stageHeading}</span>
          <span className="orientation-sep">/</span>
          <span className="orientation-state">{stageContext}</span>
        </div>
      </footer>
    </div>
  );
}
