import { useEffect, useRef, useState } from 'react';
import { Link, navigate } from '../../router';
import { UnseenCanvas } from './components/UnseenCanvas';
import './unseen-home.css';

export default function UnseenHome() {
  const [progress, setProgress] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
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

  const scrollToExplore = () => {
    const targetY = window.innerHeight * 0.95;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
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
      {/* --------------------------------------------------------------------
          TOP NAVIGATION BAR
          Quiet obsidian frosted bar, non-overlapping, strictly responsive
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
            Open Command Center <span className="arrow-glyph">→</span>
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
          decisionMode="ALLOW"
          isReducedMotion={isReducedMotion}
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
              <span className="callout-tag">INGRESS</span>
              <span className="callout-desc">Observed traffic entering boundary</span>
            </div>
          </div>
        )}

        {showInspection && (
          <div className="hp-spatial-callout callout-inspection">
            <div className="callout-line" />
            <div className="callout-content">
              <span className="callout-tag">INSPECTION</span>
              <span className="callout-desc">Gateway evaluation aperture</span>
            </div>
          </div>
        )}

        {showEvidence && (
          <div className="hp-spatial-callout callout-evidence">
            <div className="callout-line" />
            <div className="callout-content">
              <span className="callout-tag">EVIDENCE</span>
              <span className="callout-desc">Cryptographic trace committed</span>
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
            <div className="hp-eyebrow">
              <span className="hp-eyebrow-pip" />
              <span>API Security · Gateway Enforcement · Network Observability</span>
            </div>

            <h1 className="hp-hero-heading">
              <span className="heading-line">EVERY REQUEST</span>
              <span className="heading-line accent-pearl">LEAVES A TRACE.</span>
            </h1>

            <p className="hp-hero-subtitle">
              HYPERION reveals how API traffic passes through a security gateway, how decisions are made, and how every recorded finding leads back to evidence.
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
          </div>
        </div>
      </section>

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
        <div className="hp-transition-card">
          <div className="transition-eyebrow">
            <span className="transition-pip" />
            <span>INTERACTIVE NETWORK OBSERVABILITY</span>
          </div>

          <h2 className="hp-transition-heading">
            FOLLOW THE REQUEST.
          </h2>

          <p className="hp-transition-subtitle">
            From client ingress to gateway decision, protected upstream and recorded evidence.
          </p>

          <div className="hp-transition-cta-row">
            <Link href="/watch" className="hp-btn-primary large">
              WATCH THE JOURNEY <span className="arrow-glyph">→</span>
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
