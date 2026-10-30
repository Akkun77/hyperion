import React from 'react';
import { Link } from '../../../router';
import { ActIndex, DecisionMode } from '../types';

interface UnseenOverlayProps {
  progress: number;
  currentAct: ActIndex;
  decisionMode: DecisionMode;
  onSelectDecision: (mode: DecisionMode) => void;
  onJumpToAct?: (act: ActIndex) => void;
}

export const UnseenOverlay: React.FC<UnseenOverlayProps> = ({
  progress,
  currentAct,
  decisionMode,
  onSelectDecision,
  onJumpToAct,
}) => {
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
            <span className="unseen-status-pip" />
            <span className="unseen-status-label">OBSERVATORY ONLINE</span>
          </span>
        </div>

        <nav className="unseen-nav-links" aria-label="Primary Platform Navigation">
          <button
            type="button"
            className="unseen-nav-action-pill"
            onClick={() => onJumpToAct?.(0)}
            title="Explore The Unseen"
          >
            Explore
          </button>
          <Link href="/watch" className="unseen-nav-action-pill">
            Watch
          </Link>
          <Link href="/command-center" className="unseen-nav-action-button">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </nav>
      </header>

      {/* Act I: The Void (Hero Frame) */}
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
          <span className="unseen-act-eyebrow">ACT I // THE VOID</span>
          <h1 className="unseen-hero-title">
            <span className="title-line">EVERY REQUEST</span>
            <span className="title-line accent-pearl">LEAVES A TRACE.</span>
          </h1>
          <p className="unseen-hero-subtitle">
            An invisible request. A visible decision.
          </p>

          <div className="unseen-scroll-prompt">
            <span className="prompt-crosshair">+</span>
            <span className="prompt-label">SCROLL TO WITNESS</span>
            <span className="prompt-crosshair">+</span>
          </div>
        </div>

        {/* Ambient bottom wordmark integrated with depth */}
        <div className="unseen-ambient-monolith-mark" aria-hidden="true">
          HYPERION
        </div>
      </section>

      {/* Act II: Descent */}
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
          <span className="unseen-act-eyebrow">ACT II // DESCENT</span>
          <h2 className="unseen-stage-heading">A SIGNAL ENTERS.</h2>
          <p className="unseen-stage-body">
            Deep within the suspended matter, an incoming packet penetrates the perimeter.
            Architectural relationships emerge across previously invisible depth.
          </p>
          <div className="unseen-micro-annotation">
            <span className="annotation-leader-line" />
            <span className="annotation-content">TRAJECTORY CALIBRATED // 240 μs FLIGHT PATH</span>
          </div>
        </div>
      </section>

      {/* Act III: Impact */}
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
          <span className="unseen-act-eyebrow">ACT III // IMPACT</span>
          <h2 className="unseen-stage-heading">THE BOUNDARY DISTURBANCE.</h2>
          <p className="unseen-stage-body">
            The signal meets the inspection threshold. Physical deformation propagates
            outward—matter separates, inertia redistributes, and negative space reveals
            the decision plane.
          </p>
          <div className="unseen-micro-annotation">
            <span className="annotation-leader-line" />
            <span className="annotation-content">PRESSURE WAVE PROPAGATING // DETERMINISTIC MOMENTUM</span>
          </div>
        </div>
      </section>

      {/* Act IV: Decision */}
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
          <span className="unseen-act-eyebrow">ACT IV // DECISION</span>
          <h2 className="unseen-stage-heading">THREE OUTCOMES.</h2>
          <p className="unseen-stage-body">
            Every arriving signal experiences measurable physical consequence at the boundary.
            Observe the distinct mechanics of gateway policy evaluation.
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
              <span className="tab-title">ALLOW</span>
              <span className="tab-desc">Passage unobstructed</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={decisionMode === 'FLAG'}
              className={`decision-tab-pill ${decisionMode === 'FLAG' ? 'is-active flag' : ''}`}
              onClick={() => onSelectDecision('FLAG')}
            >
              <span className="status-dot flag" />
              <span className="tab-title">FLAG</span>
              <span className="tab-desc">Residual trace logged</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={decisionMode === 'BLOCK'}
              className={`decision-tab-pill ${decisionMode === 'BLOCK' ? 'is-active block' : ''}`}
              onClick={() => onSelectDecision('BLOCK')}
            >
              <span className="status-dot block" />
              <span className="tab-title">BLOCK</span>
              <span className="tab-desc">Signal arrested</span>
            </button>
          </div>

          <p className="unseen-disclaimer-note">
            CONCEPTUAL DEMONSTRATION // NO RUNTIME GATEWAY POLICIES MODIFIED
          </p>
        </div>
      </section>

      {/* Act V: Unfolding */}
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
          <span className="unseen-act-eyebrow">ACT V // UNFOLDING</span>
          <h2 className="unseen-stage-heading">
            THE UNSEEN<br />BECOMES UNDERSTOOD.
          </h2>
          <p className="unseen-stage-body">
            The abstract suspended matter resolves into coherent spatial structure.
            Discover the living hierarchy of services, boundaries, and observable endpoints.
          </p>

          <div className="unseen-hierarchy-spec">
            <div className="hierarchy-step">
              <span className="step-num">01</span>
              <span className="step-name">PLATFORM CORE</span>
            </div>
            <span className="hierarchy-arrow">→</span>
            <div className="hierarchy-step active">
              <span className="step-num">02</span>
              <span className="step-name">INGRESS & SERVICES</span>
            </div>
            <span className="hierarchy-arrow">→</span>
            <div className="hierarchy-step">
              <span className="step-num">03</span>
              <span className="step-name">AUDITABLE ENDPOINTS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Act VI: Evidence & Operational Entry */}
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
            <span className="unseen-act-eyebrow">ACT VI // EVIDENCE</span>
            <h2 className="evidence-title">
              SEE WHAT HAPPENED.<br />UNDERSTAND WHY.
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
              <span className="segment-value mono">POST /api/v2/auth/token</span>
              <span className="segment-meta">Origin: Edge Ingress</span>
            </div>
            <span className="pipeline-divider">→</span>
            <div className="pipeline-segment">
              <span className="segment-label">DECISION</span>
              <span className={`segment-value badge ${decisionMode.toLowerCase()}`}>
                {decisionMode}
              </span>
              <span className="segment-meta">Latency: 1.4ms</span>
            </div>
            <span className="pipeline-divider">→</span>
            <div className="pipeline-segment">
              <span className="segment-label">RECORDED EVIDENCE</span>
              <span className="segment-value mono hash">SHA256:7f3b…9e41</span>
              <span className="segment-meta">Audit Proof Intact</span>
            </div>
          </div>

          {/* Primary & Secondary Call to Actions */}
          <div className="evidence-action-row">
            <Link href="/command-center" className="evidence-primary-cta">
              Enter The Observatory <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center?tab=gateway" className="evidence-secondary-cta">
              Explore Secure Gateway
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Right-Side Act Scrubber Indicator */}
      <aside className="unseen-act-scrubber" aria-label="Narrative Acts Progress">
        {[
          { label: 'Void', act: 0 as ActIndex, targetP: 0.0 },
          { label: 'Descent', act: 1 as ActIndex, targetP: 0.22 },
          { label: 'Impact', act: 2 as ActIndex, targetP: 0.42 },
          { label: 'Decision', act: 3 as ActIndex, targetP: 0.58 },
          { label: 'Unfolding', act: 4 as ActIndex, targetP: 0.76 },
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
