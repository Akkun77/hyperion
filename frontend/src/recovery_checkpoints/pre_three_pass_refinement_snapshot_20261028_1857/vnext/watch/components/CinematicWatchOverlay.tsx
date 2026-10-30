import { useState } from 'react';
import { Link } from '../../../router';
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
  onProgressChange: (p: number) => void;
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
  onProgressChange,
  onTogglePlay,
  onReplay,
  onStep,
  onSelectScenario,
  onSelectDecisionMode,
}: CinematicWatchOverlayProps) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Dynamic focal statement based on active stage & verdict
  let stageTitle = '01 INGRESS';
  let focalStatement = 'Request received';
  let focalSubtitle = `Client connection established from ${scenario.clientIp}`;

  if (progress < 0.20) {
    stageTitle = '01 INGRESS';
    focalStatement = 'Request received';
    focalSubtitle = `Origin ${scenario.clientGeo} · ${scenario.method} ${scenario.path}`;
  } else if (progress < 0.40) {
    stageTitle = '02 GATEWAY';
    focalStatement = 'Route evaluated';
    focalSubtitle = 'Gateway matches endpoint routing definition and extracts bearer token';
  } else if (progress < 0.60) {
    stageTitle = '03 EVALUATE';
    focalStatement = 'Policy matched';
    focalSubtitle = scenario.policyRule;
  } else if (progress < 0.72) {
    stageTitle = '04 DECISION';
    if (decisionMode === 'ALLOW') {
      focalStatement = 'Forwarded to upstream';
      focalSubtitle = 'Policy verified — Request dispatched to protected upstream citadel';
    } else if (decisionMode === 'FLAG') {
      focalStatement = 'Anomaly marked & forwarding';
      focalSubtitle = 'Cross-tenant violation recorded — Forensic telemetry captured';
    } else {
      focalStatement = 'Intercepted before upstream';
      focalSubtitle = 'Rate threshold exceeded — Connection dropped immediately (HTTP 429)';
    }
  } else if (progress < 0.88) {
    stageTitle = '05 UPSTREAM';
    if (decisionMode === 'BLOCK') {
      focalStatement = 'Traffic isolated from citadel';
      focalSubtitle = 'Zero bytes reached protected internal services';
    } else {
      focalStatement = 'Upstream service response';
      focalSubtitle = `Citadel returned ${scenario.statusCode} ${scenario.statusText}`;
    }
  } else {
    stageTitle = '06 EVIDENCE';
    focalStatement = 'Evidence recorded';
    focalSubtitle = `Forensic trace committed: ${scenario.evidenceHash.slice(0, 24)}...`;
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
            <span className="watch-brand-symbol">H</span>
            <div className="watch-brand-titles">
              <span className="watch-brand-title">HYPERION</span>
              <span className="watch-brand-sub">GATEWAY OBSERVATORY</span>
            </div>
          </Link>
        </div>

        {/* Central Narrative Statement: connected information zone */}
        <div className="watch-focal-zone" role="status" aria-live="polite">
          <div className="focal-stage-tag">
            <span className="focal-stage-dot" style={{ backgroundColor: verdictColor }} />
            <span>{stageTitle}</span>
          </div>
          <h2 className="focal-statement-text">{focalStatement}</h2>
          <p className="focal-statement-sub">{focalSubtitle}</p>
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
            <span>{stageTitle}</span>
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

        {/* Minimal Hairline Progress Scrubber Track along bottom edge */}
        <div className="watch-hairline-timeline">
          <input
            type="range"
            className="hairline-slider"
            min="0"
            max="1"
            step="0.002"
            value={progress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            aria-label="Request Journey Progression"
          />
          <div
            className="hairline-fill"
            style={{ width: `${progress * 100}%`, backgroundColor: verdictColor }}
          />
        </div>
      </footer>
    </div>
  );
}
