import { useEffect, useState } from 'react';
import { Link } from '../../router';
import { UnseenCanvas } from './components/UnseenCanvas';
import { RequestJourneyExperience } from '../../pages/experience/RequestJourneyExperience';
import api from '../../api';
import './unseen-home.css';

export default function UnseenHome() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
                ? 'GATEWAY OBSERVATORY ONLINE (:8000)'
                : 'DEMO MODE // BACKEND OFFLINE'}
            </span>
          </span>
        </div>

        <nav className="hp-nav-links" aria-label="Platform Navigation">
          <button
            type="button"
            className="hp-nav-pill active-pill"
            onClick={() => scrollToSection('explanation-stage')}
            title="Jump to Interactive Explanation Experience"
          >
            Explore Request
          </button>
          <Link href="/watch" className="hp-nav-pill" title="Watch Hyperion Work">
            Watch
          </Link>
          <Link href="/command-center" className="hp-nav-button" title="Operational Command Center">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </nav>
      </header>

      {/* --------------------------------------------------------------------
          STAGE A: HERO / ARRIVAL (CURATED LIVING MATTER HERO MODE)
          -------------------------------------------------------------------- */}
      <section className="hp-hero-section" aria-label="Hero Introduction">
        {/* Living Matter Particle Artwork (Right/Center-right field) */}
        <div className="hp-hero-particle-stage" aria-hidden="true">
          <UnseenCanvas
            progress={0}
            decisionMode="ALLOW"
            isReducedMotion={isReducedMotion}
          />
        </div>

        {/* Hero Editorial Content (Protected Left High-Contrast Zone) */}
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
              HYPERION reveals how API requests travel through a gateway,
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
              <button
                type="button"
                className="hp-btn-primary"
                onClick={() => scrollToSection('transition-stage')}
              >
                EXPLORE THE REQUEST <span className="arrow-glyph">↓</span>
              </button>
              <Link href="/command-center" className="hp-btn-secondary">
                ENTER COMMAND CENTER <span className="arrow-glyph">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Subtle Ambient Monolith Watermark */}
        <div className="hp-hero-monolith-mark" aria-hidden="true">
          HYPERION
        </div>
      </section>

      {/* --------------------------------------------------------------------
          STAGE B: TRANSITION / REVEAL (THE ANATOMY OF A TRANSACTION)
          -------------------------------------------------------------------- */}
      <section className="hp-transition-section" id="transition-stage" aria-label="The Anatomy of a Transaction">
        <div className="transition-header-block">
          <span className="transition-eyebrow">SYSTEM ARCHITECTURE // CAUSAL REVEAL</span>
          <h2 className="transition-title">FROM LIVING TELEMETRY TO VERIFIABLE CAUSALITY.</h2>
          <p className="transition-desc">
            As uninspected API traffic moves into the gateway, the system transforms fluid digital signals
            into deterministic policy boundaries and cryptographic forensic proofs.
          </p>
        </div>

        {/* Spatial Telemetry Spine (NOT generic cards) */}
        <div className="telemetry-spine-flow">
          {/* Step 1: Ingress */}
          <div className="telemetry-step-row">
            <div className="step-coord-col">
              <span className="step-code">01 // INGRESS</span>
              <span className="step-marker" />
            </div>
            <div className="step-content-col">
              <h3 className="step-heading">The Unverified Request Arrival</h3>
              <p className="step-body">
                Incoming HTTP calls strike the reverse proxy from external caller IP addresses.
                Wire headers, HTTP verbs, payload parameters, and authorization tokens are ingested
                prior to reaching internal service infrastructure.
              </p>
              <div className="step-telemetry-badge mono">
                <span className="badge-key">VECTOR:</span>
                <span className="badge-val">CLIENT 198.51.100.24 → EDGE INGRESS</span>
              </div>
            </div>
          </div>

          {/* Step 2: Inspection */}
          <div className="telemetry-step-row">
            <div className="step-coord-col">
              <span className="step-code">02 // INSPECT</span>
              <span className="step-marker" />
            </div>
            <div className="step-content-col">
              <h3 className="step-heading">Reverse Proxy Invariant Evaluation</h3>
              <p className="step-body">
                The Secure Gateway at port 8000 intercepts execution.
                Every request is evaluated against declared OpenAPI routes, sliding-window rate limit buckets,
                and tenant identity ownership boundaries to prevent BOLA and unauthorized enumeration.
              </p>
              <div className="step-telemetry-badge mono">
                <span className="badge-key">GATEWAY:</span>
                <span className="badge-val">PORT 8000 // INVARIANT EVALUATION // LATENCY ~1.2ms</span>
              </div>
            </div>
          </div>

          {/* Step 3: Decision */}
          <div className="telemetry-step-row active-step">
            <div className="step-coord-col">
              <span className="step-code">03 // DECIDE</span>
              <span className="step-marker highlight" />
            </div>
            <div className="step-content-col">
              <h3 className="step-heading">The Deterministic Decision Boundary</h3>
              <p className="step-body">
                Gateway policies execute unambiguous enforcement:
                <strong className="accent-allow"> ALLOW</strong> forwards to upstream port 8001;
                <strong className="accent-flag"> FLAG</strong> permits execution while generating security findings;
                <strong className="accent-block"> BLOCK</strong> arrests traffic at the gateway, returning HTTP 429 and isolating upstream APIs.
              </p>
              <div className="step-telemetry-badge mono highlight">
                <span className="badge-key">DISPOSITION:</span>
                <span className="badge-val">ALLOW (200) | FLAG (403 ANOMALY) | BLOCK (429 INTERCEPT)</span>
              </div>
            </div>
          </div>

          {/* Step 4: Evidence */}
          <div className="telemetry-step-row">
            <div className="step-coord-col">
              <span className="step-code">04 // TRACE</span>
              <span className="step-marker" />
            </div>
            <div className="step-content-col">
              <h3 className="step-heading">Immutable Cryptographic Evidence</h3>
              <p className="step-body">
                Every transaction commits a SHA-256 fingerprint to disk before completing.
                Forensic dossiers anchor causal findings, wire headers, and proxy timing metrics,
                enabling comprehensive investigation across the Command Center.
              </p>
              <div className="step-telemetry-badge mono">
                <span className="badge-key">SINK:</span>
                <span className="badge-val">ev_7f3b8901ac42ce01 // SHA-256 FORENSIC RECORD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          STAGE C: THE EMBEDDED EXPLANATION EXPERIENCE (EXPERIENCE B)
          -------------------------------------------------------------------- */}
      <section className="hp-embedded-explanation-section" aria-label="Interactive Request Demonstration">
        <RequestJourneyExperience isEmbedded={true} />
      </section>

      {/* --------------------------------------------------------------------
          STAGE D: WHAT HYPERION ACTUALLY BUILT (GROUNDING CAPABILITIES)
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-built-section" aria-label="What HYPERION Actually Built">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">OPERATIONAL CAPABILITIES</span>
          <h2 className="hp-section-title">WHAT HYPERION ACTUALLY BUILT.</h2>
          <p className="hp-section-subtitle">
            HYPERION is not a mock concept. It is an active security gateway with live HTTP reverse proxying,
            dynamic policy enforcement, and persisted SQLite forensics. Explore the operational modules.
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
          FINAL INVITATION & EDITORIAL FOOTER
          -------------------------------------------------------------------- */}
      <section className="hp-section hp-invitation-section" aria-label="Final Invitation">
        <div className="hp-invitation-card">
          <span className="hp-section-eyebrow">TWO EXPERIENCES. ONE IDENTITY.</span>
          <h2 className="hp-invitation-heading">
            SEE THE SYSTEM.<br />FOLLOW THE EVIDENCE.
          </h2>
          <p className="hp-invitation-subtitle">
            Experience the living digital world, test interactive policy decisions,
            and inspect real cryptographic evidence in the operational Command Center.
          </p>
          <div className="hp-hero-cta-row">
            <Link href="/experience" className="hp-btn-primary">
              LAUNCH INTERACTIVE DEMO <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center" className="hp-btn-secondary">
              ENTER COMMAND CENTER <span className="arrow-glyph">→</span>
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
