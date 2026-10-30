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

const STAGES = [
  { id: 'ingress', label: '01 INGRESS', min: 0.0, max: 0.20, center: 0.10 },
  { id: 'gateway', label: '02 GATEWAY', min: 0.20, max: 0.40, center: 0.30 },
  { id: 'evaluate', label: '03 EVALUATE', min: 0.40, max: 0.60, center: 0.50 },
  { id: 'decision', label: '04 DECISION', min: 0.60, max: 0.70, center: 0.65 },
  { id: 'upstream', label: '05 UPSTREAM', min: 0.70, max: 0.88, center: 0.80 },
  { id: 'evidence', label: '06 EVIDENCE', min: 0.88, max: 1.0, center: 0.95 },
];

export function CinematicWatchOverlay({
  progress,
  isPlaying,
  decisionMode,
  scenario,
  scenarios,
  signalPos,
  isBackendOnline,
  onProgressChange,
  onTogglePlay,
  onReplay,
  onStep,
  onSelectScenario,
  onSelectDecisionMode,
}: CinematicWatchOverlayProps) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Determine current active stage index
  const currentStageIndex = STAGES.findIndex(
    (s) => progress >= s.min && progress <= s.max
  );
  const activeStage = STAGES[currentStageIndex !== -1 ? currentStageIndex : 0];

  // Decision accent color
  const decisionColor =
    decisionMode === 'ALLOW'
      ? 'var(--watch-allow)'
      : decisionMode === 'FLAG'
      ? 'var(--watch-flag)'
      : 'var(--watch-block)';

  return (
    <div className="cinematic-watch-overlay-root">
      {/* --------------------------------------------------------------------
          TOP NAVIGATION BAR
          Obsidian frosted glass header, strictly responsive
          -------------------------------------------------------------------- */}
      <header className="watch-top-header" role="banner">
        <div className="watch-brand-col">
          <Link href="/" className="watch-brand-link" aria-label="Hyperion Home">
            <span className="watch-brand-symbol">H</span>
            <div className="watch-brand-titles">
              <span className="watch-brand-title">HYPERION</span>
              <span className="watch-brand-sub">NETWORK OBSERVATORY</span>
            </div>
          </Link>
          <div className="watch-status-chip">
            <span className={`watch-status-dot ${isBackendOnline ? 'online' : 'offline'}`} />
            <span className="watch-status-text">
              {isBackendOnline ? 'GATEWAY LIVE (:8000)' : 'SYNTHESIS ENGINE'}
            </span>
          </div>
        </div>

        {/* Stage Progress Pills in Header */}
        <nav className="watch-stage-nav" aria-label="Journey Stages">
          {STAGES.map((s, idx) => {
            const isActive = idx === currentStageIndex;
            const isPassed = progress > s.max;
            return (
              <button
                key={s.id}
                type="button"
                className={`watch-stage-pill ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                onClick={() => onProgressChange(s.center)}
                title={`Jump to ${s.label}`}
              >
                <span className="stage-dot" />
                <span className="stage-name">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="watch-header-actions">
          <Link href="/" className="watch-nav-link" title="Return to Fractured Veil Hero">
            ← Cinematic Hero
          </Link>
          <Link href="/watch" className="watch-nav-link active" title="Cinematic Network Observatory">
            Watch
          </Link>
          <Link href="/command-center" className="watch-btn-command-center" title="Operational Command Center">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          FLOATING 3D REQUEST SIGNAL LABEL
          Tracks protagonist request entity in 3D viewport
          -------------------------------------------------------------------- */}
      {signalPos && (
        <div
          className="watch-floating-signal-tag"
          style={{
            transform: `translate3d(${Math.max(20, Math.min(window.innerWidth - 220, signalPos.x - 70))}px, ${Math.max(70, Math.min(window.innerHeight - 160, signalPos.y - 50))}px, 0)`,
          }}
          aria-hidden="true"
        >
          <div className="signal-tag-body">
            <span className={`signal-method-badge method-${scenario.method.toLowerCase()}`}>
              {scenario.method}
            </span>
            <span className="signal-path-label">{scenario.path}</span>
            <span className={`signal-decision-pip ${decisionMode.toLowerCase()}`} />
          </div>
          <div className="signal-tag-meta">
            <span>{activeStage.label}</span>
            <span>+{scenario.latencyMs}ms</span>
          </div>
          <div className="signal-tag-pointer-line" />
        </div>
      )}

      {/* --------------------------------------------------------------------
          BOTTOM PLAYBACK CONSOLE
          -------------------------------------------------------------------- */}
      <footer className="watch-bottom-console" role="region" aria-label="Playback Console">
        <div className="watch-console-container">
          {/* Row 1: Scenario Selector */}
          <div className="watch-scenario-row">
            <div className="scenario-label-wrap">
              <span className="scenario-icon">⚡</span>
              <span className="scenario-label">SCENARIO:</span>
            </div>
            <div className="scenario-pill-group">
              {scenarios.map((sc) => {
                const isCurrent = sc.id === scenario.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    className={`scenario-pill ${isCurrent ? 'selected' : ''} mode-${sc.decision.toLowerCase()}`}
                    onClick={() => onSelectScenario(sc)}
                  >
                    <span className="scenario-pill-indicator" />
                    <span className="scenario-pill-name">{sc.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Decision Override Buttons */}
            <div className="decision-override-group">
              <span className="override-label">VERDICT:</span>
              {(['ALLOW', 'FLAG', 'BLOCK'] as DecisionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`decision-override-btn ${mode.toLowerCase()} ${decisionMode === mode ? 'active' : ''}`}
                  onClick={() => onSelectDecisionMode(mode)}
                  title={`Force decision verdict to ${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Technical Inspector Toggle */}
            <button
              type="button"
              className={`inspector-toggle-btn ${isInspectorOpen ? 'open' : ''}`}
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              title="Toggle Technical Forensic Dossier"
            >
              <span>Dossier</span>
              <span className="inspector-toggle-arrow">{isInspectorOpen ? '▼' : '▲'}</span>
            </button>
          </div>

          {/* Row 2: Transport & Timeline Scrubber */}
          <div className="watch-transport-row">
            <div className="transport-controls">
              <button
                type="button"
                className="transport-btn"
                onClick={onReplay}
                title="Restart Request Journey"
              >
                ↺
              </button>
              <button
                type="button"
                className="transport-btn"
                onClick={() => onStep(-1)}
                title="Step Backward"
              >
                ◄
              </button>
              <button
                type="button"
                className={`transport-btn play-pause-btn ${isPlaying ? 'playing' : ''}`}
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                className="transport-btn"
                onClick={() => onStep(1)}
                title="Step Forward"
              >
                ►
              </button>
            </div>

            {/* Timeline Slider with Active Stage Feedback */}
            <div className="timeline-track-wrap">
              <input
                type="range"
                className="timeline-slider"
                min="0"
                max="1"
                step="0.002"
                value={progress}
                onChange={(e) => onProgressChange(parseFloat(e.target.value))}
                aria-label="Request Journey Timeline"
              />
              <div
                className="timeline-progress-fill"
                style={{ width: `${progress * 100}%`, backgroundColor: decisionColor }}
              />
            </div>

            <div className="timeline-time-display">
              <span className="time-percent">{Math.round(progress * 100)}%</span>
              <span className="time-stage-name">{activeStage.label}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            COLLAPSIBLE TECHNICAL INSPECTION DOSSIER
            Forensic wire details, policy evaluated, and evidence cryptographic hash
            ------------------------------------------------------------------ */}
        {isInspectorOpen && (
          <div className="watch-inspector-drawer" role="region" aria-label="Technical Forensic Dossier">
            <div className="inspector-content-grid">
              {/* Col 1: Wire Headers */}
              <div className="inspector-card">
                <div className="inspector-card-title">INCOMING REQUEST WIRE</div>
                <div className="inspector-data-list">
                  <div className="data-row">
                    <span className="data-key">METHOD:</span>
                    <span className="data-val bold">{scenario.method}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-key">PATH:</span>
                    <span className="data-val mono">{scenario.path}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-key">CLIENT IP:</span>
                    <span className="data-val mono">{scenario.clientIp}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-key">ORIGIN GEO:</span>
                    <span className="data-val">{scenario.clientGeo}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-key">RESULT:</span>
                    <span className={`data-val badge ${decisionMode.toLowerCase()}`}>
                      {scenario.statusCode} {scenario.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Col 2: Policy Evaluation */}
              <div className="inspector-card">
                <div className="inspector-card-title">GATEWAY POLICY EVALUATION</div>
                <div className="policy-rule-box">
                  <span className="rule-badge">ACTIVE INVARIANT</span>
                  <p className="rule-text">{scenario.policyRule}</p>
                </div>
                <ul className="invariants-list">
                  {scenario.invariants.map((inv, idx) => (
                    <li key={idx} className="invariant-item">
                      <span className="inv-check">✓</span>
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3: Recorded Cryptographic Evidence */}
              <div className="inspector-card">
                <div className="inspector-card-title">FORENSIC EVIDENCE LEDGER</div>
                <div className="evidence-hash-box">
                  <span className="hash-label">CRYPTOGRAPHIC TRACE SHA-256:</span>
                  <span className="hash-val">{scenario.evidenceHash}</span>
                </div>
                <p className="evidence-summary-text">{scenario.description}</p>
                <div className="inspector-action-row">
                  <Link href="/command-center" className="inspector-deep-link">
                    Open in Command Center <span className="arrow-glyph">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
