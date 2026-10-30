import React, { useEffect, useState } from 'react';
import './brand-introduction.css';

interface EmblemProps {
  size?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  shadowColor?: string;
  ariaHidden?: boolean;
}

/**
 * Authentic HYPERION Interlocking Ribbon Emblem.
 * Faithfully reconstructed from primary brand identity vector references.
 * Features the two intertwined, curved loops with subtle under-crossing drop-shadow accents.
 */
export const HyperionEmblem: React.FC<EmblemProps> = ({
  size = 24,
  width,
  height,
  className = '',
  style,
  color = '#FFFFFF',
  shadowColor = '#8A929B',
  ariaHidden = true,
}) => {
  const w = width ?? (size ? size * 1.65 : 40);
  const h = height ?? size ?? 24;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 60.65"
      fill="none"
      width={w}
      height={h}
      className={`hyperion-emblem ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden={ariaHidden}
    >
      {/* Interlocking Ribbon Body */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.68,0.00L24.77,0.13L27.61,0.65L30.71,1.68L33.94,3.35L37.29,5.94L50.06,18.71L62.71,5.94L65.68,3.61L70.32,1.29L75.35,0.13L81.03,0.26L86.19,1.68L88.65,2.84L91.10,4.39L94.32,7.23L97.16,11.10L98.32,13.42L99.23,16.00L100.00,20.13L99.87,25.68L99.23,28.65L98.58,30.32L99.35,32.52L100.00,36.00L100.00,40.65L99.74,42.45L98.58,46.58L97.29,49.29L96.26,50.97L93.94,53.81L91.61,55.87L89.55,57.29L86.19,58.97L83.48,59.87L80.13,60.52L77.16,60.65L74.32,60.39L71.48,59.74L66.97,57.81L63.61,55.48L49.94,41.94L37.29,54.71L33.29,57.68L30.06,59.23L27.61,60.00L24.77,60.52L21.68,60.65L18.97,60.39L13.81,58.97L10.45,57.29L8.39,55.87L6.06,53.81L3.48,50.58L1.42,46.58L0.39,43.10L0.00,40.65L0.00,36.00L0.39,33.55L1.42,30.32L0.52,27.61L0.00,24.52L0.00,20.13L0.52,17.03L1.81,13.16L3.10,10.71L5.03,8.00L7.61,5.42L10.06,3.61L13.81,1.68L17.55,0.52L19.87,0.13L21.55,0.13Z M21.81,5.29L18.71,5.55L15.48,6.58L12.26,8.39L8.90,11.48L7.23,13.94L5.94,16.77L5.16,20.26L5.03,22.71L5.29,23.61L8.13,20.90L10.97,18.97L14.58,17.29L17.81,16.39L20.52,16.00L24.13,16.00L26.84,16.39L30.58,17.55L34.06,19.35L37.81,22.32L66.58,51.23L69.03,53.03L72.00,54.45L74.84,55.23L77.29,55.48L80.65,55.23L84.52,54.06L88.13,52.00L91.10,49.16L92.65,46.97L94.19,43.48L94.97,38.97L94.71,37.03L92.00,39.61L89.42,41.42L86.06,43.10L82.19,44.26L79.48,44.65L75.87,44.65L73.16,44.26L69.42,43.10L66.58,41.68L63.35,39.35L32.77,8.90L30.71,7.48L28.39,6.32L24.39,5.29L21.94,5.29Z M77.29,5.29L75.61,5.29L72.65,5.94L69.68,7.23L67.87,8.39L66.45,9.55L53.68,22.32L57.94,26.58L63.48,21.16L66.58,18.97L68.52,17.94L71.23,16.90L75.74,16.00L80.77,16.13L85.68,17.42L88.90,18.97L91.10,20.39L93.55,22.45L94.71,23.74L94.84,23.61L94.84,20.13L94.06,16.77L92.90,14.06L90.58,10.84L87.23,8.00L84.52,6.58L80.65,5.42L77.42,5.29Z M24.00,21.29L19.61,21.29L17.81,21.68L14.45,22.97L10.84,25.42L8.65,27.74L7.10,30.19L7.48,31.23L9.42,33.81L12.52,36.52L15.87,38.32L17.81,38.97L20.65,39.48L24.00,39.48L25.68,39.23L28.26,38.45L30.45,37.42L33.03,35.61L38.32,30.45L34.06,25.94L31.10,23.61L27.87,22.06L25.55,21.42L24.13,21.29Z M79.61,21.29L75.87,21.16L73.16,21.68L71.35,22.32L69.29,23.35L67.10,24.90L61.68,30.19L65.94,34.71L68.90,37.03L71.74,38.45L76.00,39.48L79.35,39.48L81.03,39.23L83.74,38.45L86.45,37.16L88.52,35.74L90.45,33.94L91.74,32.39L92.90,30.45L92.39,29.16L90.71,26.97L87.48,24.13L84.13,22.32L81.16,21.42L79.74,21.29Z M42.19,34.19L41.94,34.06L36.65,39.35L33.42,41.68L28.77,43.74L24.13,44.65L19.35,44.52L16.26,43.87L13.29,42.84L8.65,40.13L5.29,36.90L5.03,38.97L5.81,43.48L7.35,46.97L8.90,49.16L11.23,51.48L13.42,53.03L16.13,54.32L18.71,55.10L21.68,55.48L24.39,55.35L26.84,54.84L29.29,53.94L31.35,52.77L33.55,51.10L46.32,38.32L42.32,34.32Z"
        fill={color}
      />

      {/* Under-Crossing Dimensional Shadow Accents */}
      <path d="M76.52,5.29L76.65,5.29Z" fill={shadowColor} />
      <path d="M37.16,5.81L37.29,5.94Z" fill={shadowColor} />
      <path d="M62.84,5.81L62.71,5.94Z" fill={shadowColor} />
      <path d="M53.68,15.10L57.29,18.71L53.68,22.19L50.19,18.71L53.55,15.23Z" fill={shadowColor} />
      <path d="M94.84,21.16L94.84,21.29Z" fill={shadowColor} />
      <path d="M37.81,22.32L37.94,22.45Z" fill={shadowColor} />
      <path d="M53.81,22.45L57.94,26.58L61.68,22.97L65.29,26.58L61.68,30.19L53.94,22.58Z" fill={shadowColor} />
      <path d="M35.23,27.23L35.35,27.35Z" fill={shadowColor} />
      <path d="M38.32,30.45L46.19,38.19L42.06,34.06L38.32,37.68L34.71,34.06L33.55,35.10L38.19,30.58Z" fill={shadowColor} />
      <path d="M61.81,30.45L61.94,30.58Z" fill={shadowColor} />
      <path d="M94.84,37.42L94.84,37.55Z" fill={shadowColor} />
      <path d="M46.19,38.45L49.81,42.06L46.19,45.55L42.71,42.06L46.06,38.58Z" fill={shadowColor} />
      <path d="M50.06,42.06L50.19,42.19Z" fill={shadowColor} />
      <path d="M46.19,45.81L46.06,45.94Z" fill={shadowColor} />
      <path d="M76.65,55.35L76.77,55.35Z" fill={shadowColor} />
    </svg>
  );
};

export interface HyperionLogoProps {
  compact?: boolean;
  size?: number;
  className?: string;
  subTitle?: string;
}

/**
 * Primary Brand Mark Lockup:
 * Interlocking Emblem + HYPERION / SECURITY ARCHITECTURE
 */
export const HyperionLogo: React.FC<HyperionLogoProps> = ({
  compact = false,
  size = 20,
  className = '',
  subTitle = 'SECURITY ARCHITECTURE',
}) => {
  return (
    <div className={`hyperion-brand-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <HyperionEmblem size={size} />
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: '#FFFFFF',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            HYPERION
          </span>
          <span
            style={{
              fontSize: '8.5px',
              fontWeight: 500,
              letterSpacing: '0.24em',
              color: 'rgba(198, 206, 211, 0.75)',
              fontFamily: 'JetBrains Mono, monospace, sans-serif',
              marginTop: '1px',
            }}
          >
            {subTitle}
          </span>
        </div>
      )}
    </div>
  );
};

interface LoaderProps {
  onComplete: () => void;
}

/**
 * Authentic Lusion-Style Cinematic Preloader for HYPERION.
 * References:
 * - https://lusion.co/about/
 * - https://rickcreates.com/r/2023-10-02-lusion-v3
 *
 * Composition:
 * 1. Full-viewport near-black (#07090C).
 * 2. Upper-left: Authentic white infinity emblem and understated HYPERION lockup.
 * 3. Center: Slim, restrained horizontal loading indicator (2px graphite track, pearl-white fill).
 * 4. Lower-left: Oversized, elegant rolling numeric counter (00 -> 100), safely positioned without clipping.
 * 5. Lower-right: Understated bypass indicator (ESC / CLICK TO BYPASS).
 * 6. Smooth real asset readiness synchronization with organic easing, resolving into a clean horizontal reveal wipe.
 */
export const HyperionLoaderReveal: React.FC<LoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'brandReveal' | 'progress' | 'resolved' | 'exit' | 'complete'>('brandReveal');

  useEffect(() => {
    // Immediate bypass on prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    let isCancelled = false;
    let targetVal = 15;

    // Monitor document & fonts readiness
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        targetVal = 60;
      } else {
        window.addEventListener('load', () => { targetVal = 75; }, { once: true });
      }

      if (document.fonts) {
        document.fonts.ready.then(() => {
          if (!isCancelled) targetVal = Math.max(targetVal, 90);
        }).catch(() => {});
      }
    }

    /**
     * Artistic 3.0-Second Multi-Phase Timing Sequence:
     * - 0.0s – 0.5s (0–500ms): Brand lockup reveals elegantly (opacity 0 -> 1, translateY -4px -> 0), progress at 0%
     * - 0.5s – 1.8s (500–1800ms): Progress indicator advances smoothly (0% -> 100%) synced with readiness
     * - 1.8s – 2.6s (1800–2600ms): System Ready moment, 100% numeric resolution, smooth hold
     * - 2.6s – 3.0s (2600–3000ms): Horizontal wipe and opacity reveal of the live Fractured Veil
     * - 3.0s+: Complete unmount
     */
    const startTime = performance.now();
    let currentVal = 0;
    let reqId: number;

    const updateTimeline = (now: number) => {
      if (isCancelled) return;
      const elapsed = now - startTime;

      if (elapsed < 500) {
        // Phase 1: Brand Reveal (0.0s - 0.5s)
        setPhase('brandReveal');
        setProgress(0);
      } else if (elapsed < 1800) {
        // Phase 2: Smooth Progress (0.5s - 1.8s, duration 1300ms)
        setPhase('progress');
        const progressFrac = Math.min((elapsed - 500) / 1300, 1.0);
        // Smooth cubic ease out
        const easedFrac = 1 - Math.pow(1 - progressFrac, 2.8);
        const computedTarget = Math.max(targetVal, Math.round(easedFrac * 100));
        currentVal += (computedTarget - currentVal) * 0.14;
        setProgress(Math.min(99, Math.max(1, Math.round(currentVal))));
      } else if (elapsed < 2600) {
        // Phase 3: Completion Resolution Moment (1.8s - 2.6s, duration 800ms)
        setPhase('resolved');
        setProgress(100);
      } else if (elapsed < 3000) {
        // Phase 4: Wipe and Opacity Reveal (2.6s - 3.0s, duration 400ms)
        setPhase('exit');
        setProgress(100);
      } else {
        // Sequence Complete at 3.0s
        setPhase('complete');
        onComplete();
        return;
      }

      reqId = requestAnimationFrame(updateTimeline);
    };

    reqId = requestAnimationFrame(updateTimeline);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        isCancelled = true;
        setPhase('complete');
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onComplete]);

  if (phase === 'complete') return null;

  const displayCount = Math.min(100, Math.max(0, Math.floor(progress)));
  const formattedCount = displayCount.toString().padStart(2, '0');

  return (
    <div
      className={`hyperion-lusion-loader ${phase === 'exit' ? 'loader-exit' : ''}`}
      onClick={() => {
        setPhase('complete');
        onComplete();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hyperion system initialization"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#07090C',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(28px, 4.5vh, 48px) clamp(28px, 4.5vw, 60px)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.40s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
        cursor: 'default',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Upper-Left: Authentic Brand Emblem & Title with Elegant Reveal Transition */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          opacity: 1,
          transform: phase === 'brandReveal' ? 'translateY(0)' : 'translateY(0)',
          animation: 'hpBrandFadeIn 0.50s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <HyperionEmblem size={24} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#FFFFFF',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            HYPERION
          </span>
          <span
            style={{
              fontSize: '8.5px',
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: 'rgba(174, 184, 192, 0.65)',
              fontFamily: 'JetBrains Mono, monospace',
              marginTop: '2px',
            }}
          >
            OBSERVATORY INITIALIZATION
          </span>
        </div>
      </div>

      {/* 2. Center: Restrained Slim Horizontal Loading Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(180px, 20vw, 260px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          opacity: phase === 'brandReveal' ? 0.35 : 1.0,
          transition: 'opacity 0.35s ease',
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            letterSpacing: '0.22em',
            color: phase === 'resolved' || phase === 'exit' ? '#62D4A1' : 'rgba(174, 184, 192, 0.55)',
            textTransform: 'uppercase',
            transition: 'color 0.25s ease',
          }}
        >
          {phase === 'resolved' || phase === 'exit' ? 'SYSTEM READY' : 'CALIBRATING SECURITY BOUNDARY'}
        </span>

        {/* 2px Track & Fill */}
        <div
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: '#161B22',
            borderRadius: '1px',
            overflow: 'hidden',
            position: 'relative',
            transform: phase === 'exit' ? 'scaleX(2.5)' : 'scaleX(1)',
            opacity: phase === 'exit' ? 0 : 1,
            transition: 'transform 0.40s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.40s ease',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: phase === 'resolved' || phase === 'exit'
                ? 'linear-gradient(90deg, #62D4A1 0%, #FFFFFF 100%)'
                : 'linear-gradient(90deg, #8A929B 0%, #FFFFFF 100%)',
              boxShadow: phase === 'resolved'
                ? '0 0 12px rgba(98, 212, 161, 0.65)'
                : '0 0 8px rgba(255, 255, 255, 0.45)',
              transition: 'width 0.08s linear, background 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 3. Lower Tier: Left Rolling Counter & Right Bypass Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Oversized Rolling Numeric Counter (Never clipped) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: '"Space Grotesk", -apple-system, sans-serif',
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 300,
            lineHeight: 0.88,
            letterSpacing: '-0.04em',
            color: phase === 'resolved' || phase === 'exit' ? '#FFFFFF' : '#F3F4F1',
            transition: 'color 0.25s ease',
          }}
        >
          <span>{formattedCount}</span>
          <span
            style={{
              fontSize: '0.30em',
              fontWeight: 400,
              color: phase === 'resolved' ? '#62D4A1' : 'rgba(174, 184, 192, 0.50)',
              marginLeft: '4px',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.04em',
              transition: 'color 0.25s ease',
            }}
          >
            %
          </span>
        </div>

        {/* Right Understated Skip Hint */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9.5px',
            letterSpacing: '0.20em',
            color: 'rgba(110, 118, 129, 0.65)',
            textTransform: 'uppercase',
            paddingBottom: '6px',
          }}
        >
          ESC / CLICK TO BYPASS
        </div>
      </div>
    </div>
  );
};
