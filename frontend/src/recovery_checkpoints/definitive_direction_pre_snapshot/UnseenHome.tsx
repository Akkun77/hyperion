import { useEffect, useState } from 'react';
import { Link } from '../../router';
import { UnseenCanvas } from './components/UnseenCanvas';
import api from '../../api';
import './unseen-home.css';

type PreviewDecision = 'ALLOW' | 'FLAG' | 'BLOCK';

export default function UnseenHome() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [previewDecision, setPreviewDecision] = useState<PreviewDecision>('ALLOW');

  // Probe backend health to ensure accurate status indicator
  useEffect(() => {
    let active = true;
    const probeHealth = async () => {
      try {
        const res = await api.health();
        if (active && res.status === 'ok') setIsBackendOnline(true);
      } catch {
        if (active) setIsBackendOnline(false);
      }
    };
    probeHealth();
    return () => { active = false; };
  }, []);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div className="hyperion-homepage-root">
      {/* --------------------------------------------------------------------
          TOP NAVIGATION BAR
          -------------------------------------------------------------------- */}
      <header className="hp-nav-header" role="banner">
        <div className="hp-nav-brand">
          <Link href="/" className="hp-brand-link" aria-label="Hyperion Home">
            <span className="hp-brand-symbol">H</span>
            <div className="hp-brand-text-group">
              <span className="hp-brand-title">HYPERION</span>
              <span className="hp-brand-subtitle">SECURITY ARCHITECTURE</span>
            </div>
          </Link>
          <span className="hp-status-badge">
            <span className={`hp-status-dot ${isBackendOnline ? 'online' : 'offline'}`} />
            <span className="hp-status-label">
              {isBackendOnline
                ? 'GATEWAY OBSERVATORY ONLINE'
                : 'DEMO MODE // BACKEND OFFLINE (PORT 8000)'}
            </span>
          </span>
        </div>

        <nav className="hp-nav-links" aria-label="Platform Navigation">
          <Link href="/experience" className="hp-nav-pill active-pill" title="Interactive Networking Demonstration">
            Explore
          </Link>
          <Link href="/watch" className="hp-nav-pill" title="Watch Hyperion Work">
            Watch
          </Link>
          <Link href="/command-center" className="hp-nav-button" title="Operational Command Center">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </nav>
      </header>

      {/* --------------------------------------------------------------------
          SECTION 1: HERO (CURATED PARTICLE HERO MODE)
          -------------------------------------------------------------------- */}
      <section className="hp-hero-section" aria-label="Hero Introduction">
        {/* Living Matter Particle Artwork (Occupying right/center-right region) */}
        <div className="hp-hero-particle-stage" aria-hidden="true">
          <UnseenCanvas
            progress={0}
            decisionMode="ALLOW"
            isReducedMotion={isReducedMotion}
          />
        </div>

        {/* Hero Editorial Content (Quiet, high-contrast protected zone) */}
        <div className="hp-hero-content-wrap">
          <div className="hp-hero-text-block">
            <div className="hp-eyebrow">
              <span className="hp-eyebrow-pip" />
              <span>HYPERION ARCHITECTURE</span>
            </div>

            <h1 className="hp-hero-heading">
              <span className="heading-line">EVERY REQUEST</span>
              <span className="heading-line accent-pearl">LEAVES A TRACE.</span>
            </h1>

            <p className="hp-hero-subtitle">
              HYPERION reveals how API requests travel through a security gateway,
              how decisions are made, and how evidence leads to investigation.
            </p>

            <div className="hp-hero-taxonomy">
              <span>API Security</span>
              <span className="tax-sep">•</span>
              <span>Gateway Enforcement</span>
              <span className="tax-sep">•</span>
              <span>Network Observability</span>
            </div>

            <div className="hp-hero-cta-row">
              <Link href="/experience" className="hp-btn-primary">
                EXPLORE THE SYSTEM <span className="arrow-glyph">→</span>
              </Link>
              <Link href="/command-center" className="hp-btn-secondary">
                ENTER COMMAND CENTER
              </Link>
            </div>
          </div>
        </div>

        {/* Subtle Ambient Monolith Mark in Void */}
        <div className="hp-hero-monolith-mark" aria-hidden="true">
          HYPERION
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 2: THE SYSTEM IN THREE MOVEMENTS
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-movements-section" aria-label="The System in Three Movements">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">CORE ARCHITECTURE</span>
          <h2 className="hp-section-title">THE SYSTEM IN THREE MOVEMENTS.</h2>
          <p className="hp-section-subtitle">
            How HYPERION transforms unmonitored API traffic into verifiable security decisions and cryptographic evidence.
          </p>
        </div>

        <div className="hp-movements-grid">
          {/* Movement 1: Observe */}
          <article className="hp-movement-card">
            <div className="movement-badge-row">
              <span className="movement-num">01</span>
              <span className="movement-label">OBSERVE</span>
            </div>
            <h3 className="movement-title">Surface Discovery & Behavior.</h3>
            <p className="movement-body">
              HYPERION continuously records API traffic across service vectors and exposes available endpoint inventory.
              It automatically detects and catalogs shadow APIs operating outside formal OpenAPI specifications.
            </p>
            <ul className="movement-features">
              <li>Continuous Ingress Reconnaissance</li>
              <li>OpenAPI Schema Validation</li>
              <li>Shadow Endpoint Profiling</li>
            </ul>
            <div className="movement-footer">
              <Link href="/command-center/inventory" className="movement-link">
                View API Inventory ↗
              </Link>
            </div>
          </article>

          {/* Movement 2: Decide */}
          <article className="hp-movement-card highlighted">
            <div className="movement-badge-row">
              <span className="movement-num">02</span>
              <span className="movement-label">DECIDE</span>
            </div>
            <h3 className="movement-title">Gateway Enforcement.</h3>
            <p className="movement-body">
              Every inbound payload is evaluated at the reverse proxy on port 8000.
              Gateway policies deterministically enforce ALLOW, FLAG, or BLOCK with immediate causal traceability and zero opaque verdicts.
            </p>
            <ul className="movement-features">
              <li>Inline Reverse Proxy (:8000)</li>
              <li>Sliding-Window Rate Limiting</li>
              <li>Tenant Identity Boundaries</li>
            </ul>
            <div className="movement-footer">
              <Link href="/command-center/gateway" className="movement-link">
                Inspect Gateway Policies ↗
              </Link>
            </div>
          </article>

          {/* Movement 3: Investigate */}
          <article className="hp-movement-card">
            <div className="movement-badge-row">
              <span className="movement-num">03</span>
              <span className="movement-label">INVESTIGATE</span>
            </div>
            <h3 className="movement-title">Evidence & Forensic Proof.</h3>
            <p className="movement-body">
              Persisted transaction records and detector findings lead directly to immutable cryptographic evidence dossiers,
              ensuring every security anomaly is traceable for post-incident audit.
            </p>
            <ul className="movement-features">
              <li>SHA-256 Forensic Fingerprints</li>
              <li>Causal Alert Correlation</li>
              <li>Incident Audit Navigation</li>
            </ul>
            <div className="movement-footer">
              <Link href="/command-center/alerts" className="movement-link">
                Explore Findings ↗
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 3: INTERACTIVE REQUEST PREVIEW
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-preview-section" aria-label="Interactive Request Preview">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">INTERACTIVE DEMONSTRATION</span>
          <h2 className="hp-section-title">WITNESS THE REQUEST JOURNEY.</h2>
          <p className="hp-section-subtitle">
            Preview how a selected HTTP request moves through the gateway core, evaluates policy, and reaches or is intercepted before upstream.
          </p>
        </div>

        <div className="hp-preview-stage-card">
          {/* Decision Comparator Buttons */}
          <div className="preview-selector-bar">
            <span className="selector-title">GATEWAY POLICY OUTCOME:</span>
            <div className="preview-buttons" role="radiogroup" aria-label="Preview Gateway Outcomes">
              <button
                type="button"
                role="radio"
                aria-checked={previewDecision === 'ALLOW'}
                className={`preview-btn allow ${previewDecision === 'ALLOW' ? 'active' : ''}`}
                onClick={() => setPreviewDecision('ALLOW')}
              >
                <span className="pip allow" /> ALLOW (200 OK)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={previewDecision === 'FLAG'}
                className={`preview-btn flag ${previewDecision === 'FLAG' ? 'active' : ''}`}
                onClick={() => setPreviewDecision('FLAG')}
              >
                <span className="pip flag" /> FLAG (403 Anomaly)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={previewDecision === 'BLOCK'}
                className={`preview-btn block ${previewDecision === 'BLOCK' ? 'active' : ''}`}
                onClick={() => setPreviewDecision('BLOCK')}
              >
                <span className="pip block" /> BLOCK (429 Intercept)
              </button>
            </div>
          </div>

          {/* Visual Request Conduit Strip */}
          <div className="preview-conduit-display">
            <div className="conduit-node client">
              <span className="node-tag">ORIGIN</span>
              <span className="node-name">CLIENT</span>
              <span className="node-detail mono">198.51.100.24</span>
            </div>

            <div className="conduit-line-segment active">
              <span className="conduit-pulse" />
            </div>

            <div className={`conduit-node gateway ${previewDecision.toLowerCase()}`}>
              <span className="node-tag">REVERSE PROXY</span>
              <span className="node-name">GATEWAY (:8000)</span>
              <span className="node-detail mono">{previewDecision}</span>
            </div>

            <div className={`conduit-line-segment ${previewDecision === 'BLOCK' ? 'blocked' : 'active'}`}>
              {previewDecision !== 'BLOCK' && <span className="conduit-pulse" />}
            </div>

            <div className={`conduit-node upstream ${previewDecision === 'BLOCK' ? 'isolated' : 'active'}`}>
              <span className="node-tag">PROTECTED</span>
              <span className="node-name">UPSTREAM (:8001)</span>
              <span className="node-detail mono">
                {previewDecision === 'BLOCK' ? 'UNREACHED' : previewDecision === 'FLAG' ? 'HTTP 403' : 'HTTP 200'}
              </span>
            </div>

            <div className="conduit-divider" />

            <div className="conduit-node evidence">
              <span className="node-tag">FORENSICS</span>
              <span className="node-name">EVIDENCE SINK</span>
              <span className="node-detail mono">ev_7f3b...e001</span>
            </div>
          </div>

          {/* Contextual Narrative Card */}
          <div className="preview-narrative-box">
            <div className="preview-detail-row">
              <span className="detail-key">REQUEST METHOD & PATH:</span>
              <span className="detail-val mono bold">GET /api/v1/users/user_101</span>
            </div>
            <div className="preview-detail-row">
              <span className="detail-key">EVALUATION REASON:</span>
              <span className="detail-val mono">
                {previewDecision === 'ALLOW' && 'ALLOWLIST_EXACT_MATCH: Path registered in OpenAPI spec; request forwarded.'}
                {previewDecision === 'FLAG' && 'BOLA_TENANT_MISMATCH: Resource belongs to separate tenant; forwarded with audit alert.'}
                {previewDecision === 'BLOCK' && 'RATE_LIMIT_EXCEEDED: Window quota reached; intercepted at gateway; upstream isolated.'}
              </span>
            </div>
            <div className="preview-detail-row">
              <span className="detail-key">STATUS ISOLATION:</span>
              <span className="detail-val">
                Gateway policy action is separate from upstream response code. Full trace committed to evidence.
              </span>
            </div>
          </div>

          <div className="preview-cta-strip">
            <Link href="/experience" className="hp-btn-primary">
              EXPLORE THE FULL INTERACTIVE EXPERIENCE <span className="arrow-glyph">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 4: WHAT HYPERION ACTUALLY BUILT
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-built-section" aria-label="What HYPERION Actually Built">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">CAPABILITY SHOWCASE</span>
          <h2 className="hp-section-title">WHAT HYPERION ACTUALLY BUILT.</h2>
          <p className="hp-section-subtitle">
            HYPERION is a functional security system with real HTTP reverse-proxy enforcement,
            dynamic policy evaluation, and persisted forensic evidence. Explore the six core operational modules.
          </p>
        </div>

        <div className="hp-built-grid">
          {/* Card 1 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">⇄</span>
              <span className="card-tag">PORT 8000</span>
            </div>
            <h3 className="built-title">Secure Gateway</h3>
            <p className="built-desc">
              High-throughput HTTP reverse proxy intercepting incoming client requests with route-matching rules,
              shadow policy switches, and active sliding-window rate limiting.
            </p>
            <Link href="/command-center/gateway" className="built-link">
              Open Gateway View ↗
            </Link>
          </div>

          {/* Card 2 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">⊞</span>
              <span className="card-tag">CATALOG</span>
            </div>
            <h3 className="built-title">API Inventory</h3>
            <p className="built-desc">
              Automated surface discovery mapping declared routes, parameter invariants, and undeclared shadow APIs
              operating outside approved OpenAPI specifications.
            </p>
            <Link href="/command-center/inventory" className="built-link">
              Open Inventory View ↗
            </Link>
          </div>

          {/* Card 3 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">≋</span>
              <span className="card-tag">STREAM</span>
            </div>
            <h3 className="built-title">Traffic Activity</h3>
            <p className="built-desc">
              Real-time telemetry recording method, path, caller origin IP, response status, and millisecond latency
              for comprehensive ingress auditing.
            </p>
            <Link href="/command-center/traffic" className="built-link">
              Open Traffic Activity ↗
            </Link>
          </div>

          {/* Card 4 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">⌁</span>
              <span className="card-tag">DETECTORS</span>
            </div>
            <h3 className="built-title">Threat Findings</h3>
            <p className="built-desc">
              Autonomous security detection algorithms identifying Broken Object Level Authorization (BOLA),
              parameter tampering, and burst rate abuse.
            </p>
            <Link href="/command-center/alerts" className="built-link">
              Open Threat Findings ↗
            </Link>
          </div>

          {/* Card 5 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">◉</span>
              <span className="card-tag">HIERARCHY</span>
            </div>
            <h3 className="built-title">Risk Intelligence</h3>
            <p className="built-desc">
              Graph-based hierarchical risk scoring that evaluates security exposure across platforms, service clusters,
              and individual endpoints from real historical evidence.
            </p>
            <Link href="/command-center/risk" className="built-link">
              Open Risk Intelligence ↗
            </Link>
          </div>

          {/* Card 6 */}
          <div className="built-card">
            <div className="built-card-header">
              <span className="card-glyph">⌕</span>
              <span className="card-tag">FORENSICS</span>
            </div>
            <h3 className="built-title">Investigation & Evidence</h3>
            <p className="built-desc">
              Forensic dossiers anchoring cryptographic hashes, wire headers, and causal finding links
              to individual transactions for post-incident audit.
            </p>
            <Link href="/command-center/investigation" className="built-link">
              Open Investigation View ↗
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SECTION 5: FINAL INVITATION & FOOTER
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-invitation-section" aria-label="Final Invitation">
        <div className="hp-invitation-card">
          <span className="hp-section-eyebrow">VERIFIED SECURITY PLATFORM</span>
          <h2 className="hp-invitation-heading">
            SEE THE SYSTEM.<br />FOLLOW THE EVIDENCE.
          </h2>
          <p className="hp-invitation-subtitle">
            Observe API requests in motion, evaluate gateway policy decisions,
            and verify real cryptographic evidence in the operational Command Center.
          </p>
          <div className="hp-hero-cta-row">
            <Link href="/experience" className="hp-btn-primary">
              EXPLORE THE REQUEST <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center" className="hp-btn-secondary">
              ENTER COMMAND CENTER
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="hp-footer" role="contentinfo">
        <div className="hp-footer-content">
          <div className="hp-footer-brand">
            <span className="hp-brand-symbol">H</span>
            <span className="hp-footer-title">HYPERION</span>
            <span className="hp-footer-tagline">TWO EXPERIENCES. ONE IDENTITY.</span>
          </div>

          <nav className="hp-footer-nav" aria-label="Footer Navigation">
            <Link href="/" className="footer-link">Cinematic Home</Link>
            <Link href="/experience" className="footer-link">Interactive Experience</Link>
            <Link href="/command-center" className="footer-link">Command Center</Link>
            <Link href="/watch" className="footer-link">Watch Flow</Link>
            <Link href="/legacy-home" className="footer-link">Safety Rollback</Link>
          </nav>

          <div className="hp-footer-meta">
            <span>© 2026 HYPERION SECURITY ARCHITECTURE. ALL RIGHTS RESERVED.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
