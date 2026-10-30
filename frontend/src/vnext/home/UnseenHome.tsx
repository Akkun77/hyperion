import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, navigate } from '../../router';
import { UnseenCanvas } from './components/UnseenCanvas';
import { HyperionEmblem, HyperionLoaderReveal } from '../../components/HyperionLogo';
import { DecisionMode } from './types';
import './unseen-home.css';

const SCRUBBER_NODES: { label: string; p: number }[] = [
  { label: 'VOID', p: 0.0 },
  { label: 'DESCENT', p: 0.20 },
  { label: 'IMPACT', p: 0.42 },
  { label: 'DECISION', p: 0.62 },
  { label: 'UNFOLDING', p: 0.80 },
  { label: 'EVIDENCE', p: 0.96 },
];

export default function UnseenHome() {
  const [progress, setProgress] = useState(0);
  const [currentAct, setCurrentAct] = useState(0);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('ALLOW');
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [showLoader, setShowLoader] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('skipLoader=true')) {
      return false;
    }
    return typeof window !== 'undefined' ? !sessionStorage.getItem('hyperion_loaded') : false;
  });

  const handleLoaderComplete = useCallback(() => {
    sessionStorage.setItem('hyperion_loaded', 'true');
    setShowLoader(false);
  }, []);

  const transitionRef = useRef<HTMLDivElement>(null);
  const hasTriggeredWatchRef = useRef(false);
  const autoTransitionTimerRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Track scroll progress along the scroll track and manage bottom transition
  useEffect(() => {
    let ticking = false;

    // Check if user just returned from /watch via back navigation
    const returnedFromWatch = sessionStorage.getItem('hyperion_returned_from_watch');
    if (returnedFromWatch) {
      sessionStorage.removeItem('hyperion_returned_from_watch');
      hasTriggeredWatchRef.current = true;
    }

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const rawProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
        const normProgress = Math.max(0, Math.min(1, rawProgress));

        setProgress(normProgress);

        // Derive current act index for vertical progress scrubber
        let act = 0;
        if (normProgress >= 0.88) act = 5;
        else if (normProgress >= 0.72) act = 4;
        else if (normProgress >= 0.52) act = 3;
        else if (normProgress >= 0.32) act = 2;
        else if (normProgress >= 0.12) act = 1;
        setCurrentAct(act);

        // Controlled accessible transition to /watch:
        // When visitor intentionally reaches the final scroll boundary (> 0.99)
        // and stays for 1200ms, smoothly navigate to /watch.
        if (normProgress >= 0.99 && !hasTriggeredWatchRef.current && scrollTop > 400) {
          if (!autoTransitionTimerRef.current) {
            autoTransitionTimerRef.current = window.setTimeout(() => {
              hasTriggeredWatchRef.current = true;
              sessionStorage.setItem('hyperion_returned_from_watch', 'true');
              navigate('/watch');
            }, 1200);
          }
        } else if (normProgress < 0.95) {
          if (autoTransitionTimerRef.current) {
            clearTimeout(autoTransitionTimerRef.current);
            autoTransitionTimerRef.current = null;
          }
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (autoTransitionTimerRef.current) clearTimeout(autoTransitionTimerRef.current);
    };
  }, []);

  const scrollToP = useCallback((targetP: number) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: targetP * maxScroll,
      behavior: isReducedMotion ? 'auto' : 'smooth',
    });
  }, [isReducedMotion]);

  const scrollToExplore = () => {
    scrollToP(0.42);
  };

  const scrollToTransition = () => {
    if (transitionRef.current) {
      transitionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    hasTriggeredWatchRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic opacities based on progress
  const heroOpacity = Math.max(0, 1 - progress * 2.2);
  const transitionOpacity = Math.min(1, Math.max(0, (progress - 0.45) * 2.5));

  // Contextual labels anchored to progress
  const showIngress = progress >= 0.08 && progress <= 0.32;
  const showInspection = progress >= 0.36 && progress <= 0.65;
  const showEvidence = progress >= 0.68 && progress <= 0.92;

  return (
    <div className="hyperion-homepage-root">
      {/* Cinematic Brand Reveal Loader (Lusion-grade restraint) */}
      {showLoader && !isReducedMotion && (
        <HyperionLoaderReveal onComplete={handleLoaderComplete} />
      )}
      {/* --------------------------------------------------------------------
          TOP NAVIGATION BAR
          Quiet obsidian frosted bar, non-overlapping, strictly responsive
          -------------------------------------------------------------------- */}
      <header className="hp-nav-header" role="banner">
        <div className="hp-nav-brand">
          <Link href="/" className="hp-brand-link" aria-label="Hyperion Home">
            <span className="hp-brand-symbol">
              <HyperionEmblem size={20} />
            </span>
            <div className="hp-brand-text-group">
              <span className="hp-brand-title">HYPERION</span>
            </div>
          </Link>
          <span className="hp-status-badge mono">
            <span className="hp-status-dot online" />
            <span>OBSERVATORY ONLINE</span>
          </span>
        </div>

        <nav className="hp-nav-links" aria-label="Platform Navigation">
          <button
            type="button"
            className="hp-nav-pill hp-nav-explore"
            onClick={scrollToTransition}
            title="Explore Request Journey"
          >
            Explore
          </button>
          <Link href="/watch" className="hp-nav-pill hp-nav-watch" title="Watch Hyperion Work">
            Watch
          </Link>
          <Link href="/command-center" className="hp-nav-button" title="Open Operational Command Center">
            Enter Command Center <span className="arrow-glyph">→</span>
          </Link>
        </nav>
      </header>

      {/* --------------------------------------------------------------------
          FULLSCREEN 3D WEBGL STAGE (THE FRACTURED VEIL)
          Fixed behind content, driven by scroll progress
          -------------------------------------------------------------------- */}
      <div className="hp-hero-particle-stage" aria-hidden="true">
        <UnseenCanvas
          progress={progress}
          decisionMode={decisionMode}
          isReducedMotion={isReducedMotion}
          renderMode="both"
        />
      </div>

      {/* --------------------------------------------------------------------
          SPATIAL CONTEXT CALLOUTS
          Subtle, restrained contextual markers anchored to the sculpture
          -------------------------------------------------------------------- */}
      <div className="hp-spatial-context-layer" aria-hidden="true">
        {showIngress && (
          <div className="hp-spatial-callout callout-ingress">
            <div className="callout-line" />
            <div className="callout-content">
              <span className="callout-tag">REQUEST RECEIVED</span>
              <span className="callout-desc">Identifiable API signal enters gateway perimeter</span>
            </div>
          </div>
        )}

        {showInspection && (
          <div className="hp-spatial-callout callout-inspection">
            <div className="callout-line" />
            <div className="callout-content">
              <span className="callout-tag">REQUEST UNDER INSPECTION</span>
              <span className="callout-desc">Policy aperture evaluates route invariants</span>
            </div>
          </div>
        )}

        {showEvidence && (
          <div className="hp-spatial-callout callout-evidence" style={{ pointerEvents: 'auto' }}>
            <div className="callout-line" />
            <div className="callout-content">
              <span className="callout-tag">POLICY DECISION</span>
              <span className="callout-desc">
                {decisionMode === 'ALLOW' && 'Permitted to upstream citadel · Evidence trace committed'}
                {decisionMode === 'FLAG' && 'Anomaly detected · Forwarded with audit flag & evidence branch'}
                {decisionMode === 'BLOCK' && 'Signal arrested at aperture · Upstream unreached · Violation recorded'}
              </span>

              {/* Minimal verdict outcome preview selector */}
              <div className="callout-verdict-pills" role="radiogroup" aria-label="Simulate Decision">
                {(['ALLOW', 'FLAG', 'BLOCK'] as DecisionMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={decisionMode === mode}
                    className={`callout-pill pill-${mode.toLowerCase()} ${decisionMode === mode ? 'active' : ''}`}
                    onClick={() => setDecisionMode(mode)}
                  >
                    <span className={`pill-dot ${mode.toLowerCase()}`} />
                    <span>{mode}</span>
                  </button>
                ))}
              </div>

              <div className="callout-obs-tag mono">
                ILLUSTRATIVE OBSERVATION · GET /api/v1/users/202/profile
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------
          FIRST SCREEN: THE CINEMATIC HERO
          Artwork is the hero; typography is minimal, disciplined, and left-aligned
          -------------------------------------------------------------------- */}
      <section className="hp-hero-section" aria-label="Hero Introduction">
        <div
          className="hp-hero-content-wrap"
          style={{ opacity: isReducedMotion ? 1 : heroOpacity }}
        >
          <div className="hp-hero-text-block">
            <h1 className="hp-hero-heading">
              <span className="heading-line">EVERY REQUEST</span>
              <span className="heading-line accent-pearl">LEAVES A TRACE.</span>
            </h1>

            <p className="hp-hero-subtitle">
              An invisible request. A visible decision.
            </p>

            <div className="hp-hero-cta-row">
              <button
                type="button"
                className="hp-btn-primary"
                onClick={scrollToExplore}
              >
                WATCH A REQUEST <span className="arrow-glyph">↓</span>
              </button>
              <Link href="/command-center" className="hp-btn-secondary">
                OPEN COMMAND CENTER <span className="arrow-glyph">→</span>
              </Link>
            </div>

            <button
              type="button"
              className="unseen-scroll-prompt"
              onClick={scrollToExplore}
              aria-label="Scroll to witness request journey"
            >
              <span className="prompt-crosshair">+</span>
              <span className="prompt-label">SCROLL TO WITNESS</span>
              <span className="prompt-crosshair">+</span>
            </button>
          </div>
        </div>

        {/* Oversized ambient background identity watermark:
            Anchored to lower hero, strictly dissolves as hero exits, never drifts upward */}
        <div
          className="unseen-ambient-monolith-mark mono"
          aria-hidden="true"
          style={{
            opacity: Math.max(0, 1 - progress * 5.2) * (isReducedMotion ? 0.038 : 0.042),
            transform: `translate3d(0, ${progress * 25}px, 0)`,
          }}
        >
          HYPERION
        </div>
      </section>

      {/* --------------------------------------------------------------------
          RIGHT-SIDE NARRATIVE ACT SCRUBBER
          Minimal vertical node rail for spatial awareness and navigation
          -------------------------------------------------------------------- */}
      <aside className="unseen-act-scrubber" aria-label="Narrative Acts Progress">
        {SCRUBBER_NODES.map((item, idx) => (
          <button
            key={item.label}
            type="button"
            className={`scrubber-node ${currentAct === idx ? 'is-active' : ''}`}
            onClick={() => scrollToP(item.p)}
            title={`Act ${idx + 1}: ${item.label}`}
          >
            <span className="node-pip" />
            <span className="node-label">{item.label}</span>
          </button>
        ))}
      </aside>

      {/* --------------------------------------------------------------------
          CINEMATIC SCROLL TRACK (220vh)
          Allows camera and sculpture unfolding to glide smoothly
          -------------------------------------------------------------------- */}
      <div className="hp-scroll-track" aria-hidden="true" />

      {/* --------------------------------------------------------------------
          BOTTOM TRANSITION SECTION: OPENS THE WATCH EXPERIENCE
          Full-screen entry composition at the end of scroll
          -------------------------------------------------------------------- */}
      <section
        className="hp-bottom-transition-section"
        ref={transitionRef}
        aria-label="Transition to Watch Experience"
        style={{
          opacity: isReducedMotion ? 1 : transitionOpacity,
          pointerEvents: progress > 0.50 ? 'auto' : 'none',
        }}
      >
        <div className="hp-transition-editorial">
          <div className="hp-trace-continuation-pill mono">
            <span className="pill-dot allow" />
            <span>CONTINUOUS TRACE: GET /api/v1/users/202/profile → ENTERING CITADEL</span>
          </div>

          <div className="hp-transition-eyebrow">
            <span className="hp-eyebrow-pip" />
            <span>APERTURE HANDOFF · CAUSAL DEMONSTRATION</span>
          </div>

          <h2 className="hp-transition-heading">
            FOLLOW THE REQUEST.
          </h2>

          <p className="hp-transition-subtitle">
            Watch an API request move from ingress to a recorded security decision.
          </p>

          <div className="hp-transition-cta-row">
            <Link href="/watch" className="hp-btn-primary large">
              WATCH THE COMPLETE JOURNEY <span className="arrow-glyph">→</span>
            </Link>
            <Link href="/command-center" className="hp-btn-secondary large">
              OPEN COMMAND CENTER <span className="arrow-glyph">→</span>
            </Link>
          </div>

          <div className="hp-transition-back-row">
            <button
              type="button"
              className="hp-btn-back-to-top"
              onClick={scrollToTop}
            >
              ↑ RETURN TO TOP
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
