import React from 'react';
import { Link } from '../../../router';
import { ActIndex, DecisionMode, REAL_DEMO_TRACES } from '../types';

interface UnseenOverlayProps {
  progress: number;
  currentAct: ActIndex;
  decisionMode: DecisionMode;
  onSelectDecision: (mode: DecisionMode) => void;
  onJumpToAct?: (act: ActIndex) => void;
  isBackendOnline?: boolean;
}

export const UnseenOverlay: React.FC<UnseenOverlayProps> = ({
  progress,
  currentAct,
  decisionMode,
  onSelectDecision,
  onJumpToAct,
  isBackendOnline = false,
}) => {
  const trace = REAL_DEMO_TRACES[decisionMode];

  // Compute act-specific opacity envelopes for ultra-smooth transitions
  const getActOpacity = (start: number, peakStart: number, peakEnd: number, end: number) => {
    if (progress < start || progress > end) return 0;
    if (progress >= peakStart && progress <= peakEnd) return 1;
    if (progress < peakStart) return (progress - start) / (peakStart - start);
    return (end - progress) / (end - peakEnd);
  };

  // Strictly partitioned opacity envelopes — guaranteed zero chapter overlap
  const act1Opacity = getActOpacity(-0.05, 0.00, 0.11, 0.15);
  const act2Opacity = getActOpacity(0.16, 0.19, 0.28, 0.31);
  const act3Opacity = getActOpacity(0.33, 0.36, 0.46, 0.49);
  const act4Opacity = getActOpacity(0.51, 0.54, 0.64, 0.67);
  const act5Opacity = getActOpacity(0.69, 0.72, 0.80, 0.83);
  const act6Opacity = getActOpacity(0.86, 0.90, 1.00, 1.05);

  return (
    <div className="unseen-overlay-root">
      {/* Permanent Sparse Studio Navigation Bar */}
      <header className="unseen-nav-bar" role="banner">
        <div className="unseen-brand-mark">
          <Link href="/" className="unseen-brand-link" aria-label="Hyperion Home">
            <span className="unseen-brand-symbol">H</span>
            <span className="unseen-brand-text">HYPERION</span>
          </Link>
          <span className="unseen-environment-status">
            <span className={`unseen-status-pip ${isBackendOnline ? 'online' : 'offline'}`} />
            <span className="unseen-status-label">
              {isBackendOnline
                ? 'GATEWAY OBSERVATORY ONLINE'
                : 'DEMO MODE // BACKEND OFFLINE (PORT 8000)'}
            </span>
          </span>
        </div>

        <nav className="unseen-nav-links" aria-label="Primary Platform Navigation">
          <Link
            href="/experience"
            className="unseen-nav-action-pill"
            title="Explore The Request Journey"
          >
            Explore
          </Link>
          <Link href="/watch" className="unseen-nav-action-pill">
            Watch
          </Link>
          <Link href="/command-center" className="unseen-nav-action-button">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </nav>
      </header>

      {/* Act I: The Void (Restored Flowing Hero) */}
      <section
        className="unseen-narrative-stage act-1"
        style={{
          opacity: act1Opacity,
          pointerEvents: act1Opacity > 0.4 ? 'auto' : 'none',
          visibility: act1Opacity > 0.01 ? 'visible' : 'hidden',
          display: act1Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act1Opacity < 0.4}
      >
        <div className="unseen-hero-content">
          <span className="unseen-act-eyebrow">HYPERION ARCHITECTURE</span>
          <h1 className="unseen-hero-title">
            <span className="title-line">EVERY REQUEST</span>
            <span className="title-line accent-pearl">LEAVES A TRACE.</span>
          </h1>
          <p className="unseen-hero-subtitle">
            Explore how HYPERION observes API requests, evaluates gateway decisions, and follows the evidence behind them.
          </p>

          <div className="unseen-hero-cta-group">
            <Link href="/experience" className="unseen-primary-cta">
              EXPLORE THE REQUEST <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center" className="unseen-secondary-cta">
              ENTER COMMAND CENTER
            </Link>
          </div>

          <div className="unseen-scroll-prompt">
            <span className="prompt-crosshair">+</span>
            <span className="prompt-label">SCROLL TO EXPERIENCE CINEMATIC JOURNEY</span>
            <span className="prompt-crosshair">+</span>
          </div>
        </div>

        {/* Ambient bottom wordmark integrated with depth: anchored to lower hero, dissolves on exit */}
        <div
          className="unseen-ambient-monolith-mark"
          aria-hidden="true"
          style={{
            opacity: Math.max(0, 1 - progress * 5.0) * 0.042,
            transform: `translate3d(0, ${progress * 25}px, 0)`,
          }}
        >
          HYPERION
        </div>
      </section>

      {/* Act II: Routing */}
      <section
        className="unseen-narrative-stage act-2"
        style={{
          opacity: act2Opacity,
          pointerEvents: act2Opacity > 0.4 ? 'auto' : 'none',
          visibility: act2Opacity > 0.01 ? 'visible' : 'hidden',
          display: act2Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act2Opacity < 0.4}
      >
        <div className="unseen-narrative-card left-aligned">
          <span className="unseen-act-eyebrow">ACT II // ROUTING</span>
          <h2 className="unseen-stage-heading">FROM CLIENT TO GATEWAY.</h2>
          <p className="unseen-stage-body">
            Deep within the suspended matter, an incoming request travels along the ingress current toward the reverse proxy on port 8000. Headers, method, and route are locked for inspection.
          </p>
          <div className="unseen-micro-annotation">
            <span className="annotation-leader-line" />
            <span className="annotation-content">
              INBOUND // {trace.method} {trace.endpoint} // PORT 8000 ──► UPSTREAM :8001 // LATENCY {trace.latencyMs}ms
            </span>
          </div>
        </div>
      </section>

      {/* Act III: Policy Evaluation Impact */}
      <section
        className="unseen-narrative-stage act-3"
        style={{
          opacity: act3Opacity,
          pointerEvents: act3Opacity > 0.4 ? 'auto' : 'none',
          visibility: act3Opacity > 0.01 ? 'visible' : 'hidden',
          display: act3Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act3Opacity < 0.4}
      >
        <div className="unseen-narrative-card right-aligned">
          <span className="unseen-act-eyebrow">ACT III // POLICY EVALUATION</span>
          <h2 className="unseen-stage-heading">
            BEFORE THE RESPONSE,<br />THERE IS A DECISION.
          </h2>
          <p className="unseen-stage-body">
            The request strikes the gateway inspection threshold. Allowlist validation, BOLA ownership checks, and token classification deform the boundary plane—matter separates, inertia redistributes, and negative space reveals the decision plane.
          </p>
          <div className="unseen-micro-annotation">
            <span className="annotation-leader-line" />
            <span className="annotation-content">
              THRESHOLD BOUNDARY // POLICY EVALUATION IN PROGRESS // DETERMINISTIC MOMENTUM
            </span>
          </div>
        </div>
      </section>

      {/* Act IV: Decisions & Consequences */}
      <section
        className="unseen-narrative-stage act-4"
        style={{
          opacity: act4Opacity,
          pointerEvents: act4Opacity > 0.4 ? 'auto' : 'none',
          visibility: act4Opacity > 0.01 ? 'visible' : 'hidden',
          display: act4Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act4Opacity < 0.4}
      >
        <div className="unseen-narrative-card left-aligned">
          <span className="unseen-act-eyebrow">ACT IV // DECISIONS & CONSEQUENCES</span>
          <h2 className="unseen-stage-heading">THREE DECISIONS.<br />THREE CONSEQUENCES.</h2>
          <p className="unseen-stage-body">
            Every arriving signal experiences measurable physical and operational consequences at the gateway. Select a mode to evaluate how the gateway responds:
          </p>

          {/* Interactive Decision Mode Switcher */}
          <div className="unseen-decision-switcher" role="radiogroup" aria-label="Simulated Decision Outcome">
            <button
              type="button"
              role="radio"
              aria-checked={decisionMode === 'ALLOW'}
              className={`decision-tab-pill ${decisionMode === 'ALLOW' ? 'is-active allow' : ''}`}
              onClick={() => onSelectDecision('ALLOW')}
            >
              <span className="status-dot allow" />
              <div className="tab-text-group">
                <span className="tab-title">ALLOW (200 OK)</span>
                <span className="tab-desc">Passage unobstructed</span>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={decisionMode === 'FLAG'}
              className={`decision-tab-pill ${decisionMode === 'FLAG' ? 'is-active flag' : ''}`}
              onClick={() => onSelectDecision('FLAG')}
            >
              <span className="status-dot flag" />
              <div className="tab-text-group">
                <span className="tab-title">FLAG (403 ANOMALY)</span>
                <span className="tab-desc">BOLA mismatch logged to Evidence</span>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={decisionMode === 'BLOCK'}
              className={`decision-tab-pill ${decisionMode === 'BLOCK' ? 'is-active block' : ''}`}
              onClick={() => onSelectDecision('BLOCK')}
            >
              <span className="status-dot block" />
              <div className="tab-text-group">
                <span className="tab-title">BLOCK (429 INTERCEPT)</span>
                <span className="tab-desc">Signal arrested at threshold</span>
              </div>
            </button>
          </div>

          <div className="unseen-decision-detail-card">
            <span className="detail-tag">{trace.gatewayDecision} DETAIL</span>
            <p className="detail-reason">{trace.decisionReason}</p>
          </div>

          <p className="unseen-disclaimer-note">
            GATEWAY DECISION IS INDEPENDENT FROM UPSTREAM HTTP STATUS // AUDIT TRAILS COMMITTED
          </p>
        </div>
      </section>

      {/* Act V: Network Topology Revealed */}
      <section
        className="unseen-narrative-stage act-5"
        style={{
          opacity: act5Opacity,
          pointerEvents: act5Opacity > 0.4 ? 'auto' : 'none',
          visibility: act5Opacity > 0.01 ? 'visible' : 'hidden',
          display: act5Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act5Opacity < 0.4}
      >
        <div className="unseen-narrative-card left-aligned">
          <span className="unseen-act-eyebrow">ACT V // TOPOLOGY REVEALED</span>
          <h2 className="unseen-stage-heading">
            KNOW THE NETWORK.<br />FIND THE EXPOSURE.
          </h2>
          <p className="unseen-stage-body">
            The abstract suspended matter resolves into the living hierarchy of services, boundaries, and observable endpoints.
          </p>

          <div className="unseen-hierarchy-spec">
            <div className="hierarchy-step">
              <span className="step-num">01</span>
              <span className="step-name">PLATFORM CORE</span>
            </div>
            <span className="hierarchy-arrow">→</span>
            <div className="hierarchy-step active">
              <span className="step-num">02</span>
              <span className="step-name">GATEWAY INGRESS (:8000)</span>
            </div>
            <span className="hierarchy-arrow">→</span>
            <div className="hierarchy-step">
              <span className="step-num">03</span>
              <span className="step-name">AUDITABLE ENDPOINTS (:8001)</span>
            </div>
          </div>

          <div className="unseen-endpoint-catalog-preview">
            <div className="catalog-item">
              <span className="method-tag get">GET</span>
              <span className="path mono">/api/v1/users/{'{user_id}'}</span>
              <span className="risk-tag low">LOW RISK</span>
            </div>
            <div className="catalog-item">
              <span className="method-tag get">GET</span>
              <span className="path mono">/api/v1/users/{'{user_id}'}/balance</span>
              <span className="risk-tag high">BOLA SENSITIVE</span>
            </div>
            <div className="catalog-item">
              <span className="method-tag post">POST</span>
              <span className="path mono">/api/v1/payments</span>
              <span className="risk-tag crit">RATE PROTECTED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Act VI: Evidence Dossier & Operational Link */}
      <section
        className="unseen-narrative-stage act-6"
        style={{
          opacity: act6Opacity,
          pointerEvents: act6Opacity > 0.4 ? 'auto' : 'none',
          visibility: act6Opacity > 0.01 ? 'visible' : 'hidden',
          display: act6Opacity > 0.01 ? 'flex' : 'none',
        }}
        aria-hidden={act6Opacity < 0.4}
      >
        <div className="unseen-editorial-evidence-card">
          <div className="evidence-header">
            <span className="unseen-act-eyebrow">ACT VI // EVIDENCE DOSSIER</span>
            <h2 className="evidence-title">
              SEE THE DECISION.<br />FOLLOW THE EVIDENCE.
            </h2>
            <p className="evidence-summary">
              When an API request leaves a trace, Hyperion anchors it with immutable,
              reproducible evidence across the entire transaction lifecycle.
            </p>
          </div>

          {/* Structured Evidence Pipeline Diagram */}
          <div className="evidence-pipeline-strip">
            <div className="pipeline-segment">
              <span className="segment-label">REQUEST</span>
              <span className="segment-value mono">{trace.method} {trace.endpoint}</span>
              <span className="segment-meta">Caller: {trace.callerIp}</span>
            </div>
            <span className="pipeline-divider">→</span>
            <div className="pipeline-segment">
              <span className="segment-label">GATEWAY EVALUATION</span>
              <span className={`segment-value badge ${decisionMode.toLowerCase()}`}>
                {decisionMode} // {trace.statusCode}
              </span>
              <span className="segment-meta">Proxy Latency: {trace.latencyMs}ms</span>
            </div>
            <span className="pipeline-divider">→</span>
            <div className="pipeline-segment">
              <span className="segment-label">RECORDED EVIDENCE</span>
              <span className="segment-value mono hash">{trace.evidenceHash}</span>
              <span className="segment-meta">Target: {trace.upstreamTarget}</span>
            </div>
          </div>

          {/* Primary & Secondary Call to Actions */}
          <div className="evidence-action-row">
            <Link href="/experience" className="evidence-primary-cta">
              EXPLORE THE REQUEST <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center" className="evidence-secondary-cta">
              ENTER COMMAND CENTER
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Right-Side Act Scrubber Indicator */}
      <aside className="unseen-act-scrubber" aria-label="Narrative Acts Progress">
        {[
          { label: 'Void', act: 0 as ActIndex, targetP: 0.0 },
          { label: 'Routing', act: 1 as ActIndex, targetP: 0.22 },
          { label: 'Policy', act: 2 as ActIndex, targetP: 0.42 },
          { label: 'Decisions', act: 3 as ActIndex, targetP: 0.58 },
          { label: 'Topology', act: 4 as ActIndex, targetP: 0.76 },
          { label: 'Evidence', act: 5 as ActIndex, targetP: 0.96 },
        ].map((item) => (
          <button
            key={item.act}
            type="button"
            className={`scrubber-node ${currentAct === item.act ? 'is-active' : ''}`}
            onClick={() => onJumpToAct?.(item.act)}
            title={`Jump to Act ${item.act + 1}: ${item.label}`}
          >
            <span className="node-pip" />
            <span className="node-label">{item.label}</span>
          </button>
        ))}
      </aside>
    </div>
  );
};
