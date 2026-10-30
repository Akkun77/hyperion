import { useEffect, useRef } from 'react';

/**
 * HYPERION Architectural Environment — The Fractured Veil Contextual Backdrop
 * Lightweight, high-performance canvas backdrop suspended behind all Command Center views.
 *
 * Echoes the Fractured Veil sculpture with:
 * - Satin titanium & dark graphite directional ribbon canopies (upper drape, mid torsion, lower wave)
 * - Restrained emerald caustic illumination (security intelligence aperture glow)
 * - Delicate metallic surface striations (fluted curvature lines)
 * - Faint micro-particle living current drifting along the central spline
 *
 * 100% lightweight 2D canvas — 0 WebGL overhead, respecting prefers-reduced-motion.
 */
export function VeilContextualBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize micro-particle drift cohort (~110 particles along primary & secondary splines)
    const particleCount = 110;
    const particles = new Float32Array(particleCount * 4); // [u, laneOffset, speed, phase]
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 4;
      particles[idx] = Math.random(); // longitudinal position u in [0, 1]
      particles[idx + 1] = (Math.random() - 0.5) * 56; // transverse offset in px
      particles[idx + 2] = 0.00030 + Math.random() * 0.00045; // longitudinal speed
      particles[idx + 3] = Math.random() * Math.PI * 2; // twinkle phase
    }

    // Central spline 1: Upper right canopy curve
    const getSpline1 = (u: number, time: number) => {
      const wave = prefersReducedMotion ? 0 : Math.sin(time * 0.8) * 12;
      const p0x = width * 0.38, p0y = -40;
      const p1x = width * 0.65, p1y = height * 0.24 + wave;
      const p2x = width * 0.85, p2y = height * 0.55 - wave * 0.8;
      const p3x = width * 0.98, p3y = height * 0.92;

      const omt = 1 - u;
      const x = omt * omt * omt * p0x + 3 * omt * omt * u * p1x + 3 * omt * u * u * p2x + u * u * u * p3x;
      const y = omt * omt * omt * p0y + 3 * omt * omt * u * p1y + 3 * omt * u * u * p2y + u * u * u * p3y;
      return { x, y };
    };

    // Central spline 2: Lower transverse wave curve
    const getSpline2 = (u: number, time: number) => {
      const wave = prefersReducedMotion ? 0 : Math.cos(time * 0.7) * 10;
      const p0x = width * 0.15, p0y = height * 0.78 + wave;
      const p1x = width * 0.45, p1y = height * 0.68 - wave;
      const p2x = width * 0.75, p2y = height * 0.82 + wave * 0.6;
      const p3x = width + 30, p3y = height * 0.72;

      const omt = 1 - u;
      const x = omt * omt * omt * p0x + 3 * omt * omt * u * p1x + 3 * omt * u * u * p2x + u * u * u * p3x;
      const y = omt * omt * omt * p0y + 3 * omt * omt * u * p1y + 3 * omt * u * u * p2y + u * u * u * p3y;
      return { x, y };
    };

    let time = 0;
    const render = () => {
      if (!prefersReducedMotion) {
        time += 0.0018;
      }
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Obsidian Void Baseline with directional vignette
      const baseGrad = ctx.createRadialGradient(
        width * 0.72,
        height * 0.32,
        60,
        width * 0.72,
        height * 0.32,
        width * 0.90
      );
      baseGrad.addColorStop(0, '#10141B');
      baseGrad.addColorStop(0.45, '#090B0F');
      baseGrad.addColorStop(1, '#050608');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      const wave = prefersReducedMotion ? 0 : Math.sin(time) * 14;

      // 2. Restrained Emerald Aperture Caustic Glow (Security Intelligence Aperture)
      const emeraldGlow = ctx.createRadialGradient(
        width * 0.68,
        height * 0.36 + wave * 0.5,
        30,
        width * 0.68,
        height * 0.36 + wave * 0.5,
        width * 0.52
      );
      emeraldGlow.addColorStop(0, 'rgba(86, 215, 164, 0.095)');
      emeraldGlow.addColorStop(0.35, 'rgba(40, 140, 102, 0.048)');
      emeraldGlow.addColorStop(0.70, 'rgba(18, 55, 42, 0.015)');
      emeraldGlow.addColorStop(1, 'rgba(5, 6, 8, 0)');
      ctx.fillStyle = emeraldGlow;
      ctx.fillRect(0, 0, width, height);

      // Secondary soft emerald caustics across mid-lower quadrant
      const emeraldLower = ctx.createRadialGradient(
        width * 0.32,
        height * 0.75,
        40,
        width * 0.32,
        height * 0.75,
        width * 0.42
      );
      emeraldLower.addColorStop(0, 'rgba(86, 215, 164, 0.055)');
      emeraldLower.addColorStop(0.50, 'rgba(30, 95, 72, 0.020)');
      emeraldLower.addColorStop(1, 'rgba(5, 6, 8, 0)');
      ctx.fillStyle = emeraldLower;
      ctx.fillRect(0, 0, width, height);

      // 3. FRACTURED VEIL — RIBBON A: Primary Upper Canopy Drape (Satin Titanium)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.42, -40);
      ctx.bezierCurveTo(
        width * 0.62,
        height * 0.22 + wave,
        width * 0.84,
        height * 0.52 - wave * 0.8,
        width + 40,
        height * 0.85
      );
      ctx.lineTo(width + 40, -40);
      ctx.closePath();

      const drapeGrad = ctx.createLinearGradient(width * 0.45, 0, width, height * 0.75);
      drapeGrad.addColorStop(0, 'rgba(195, 208, 220, 0.060)');
      drapeGrad.addColorStop(0.30, 'rgba(238, 244, 250, 0.115)'); // Specular crest highlight
      drapeGrad.addColorStop(0.65, 'rgba(110, 125, 140, 0.055)'); // Graphite core shadow
      drapeGrad.addColorStop(1, 'rgba(5, 6, 8, 0.0)');
      ctx.fillStyle = drapeGrad;
      ctx.fill();
      ctx.restore();

      // 4. FRACTURED VEIL — RIBBON B: Mid-Torsion Twist (Liquid Mercury / Obsidian Ribbon)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.52, -20);
      ctx.bezierCurveTo(
        width * 0.72,
        height * 0.26 + wave * 1.1,
        width * 0.90,
        height * 0.48 - wave * 0.7,
        width + 30,
        height * 0.74
      );
      ctx.lineTo(width + 30, height * 0.48);
      ctx.bezierCurveTo(
        width * 0.82,
        height * 0.32 - wave * 0.4,
        width * 0.68,
        height * 0.14 + wave * 0.7,
        width * 0.58,
        -20
      );
      ctx.closePath();

      const twistGrad = ctx.createLinearGradient(width * 0.55, 0, width, height * 0.65);
      twistGrad.addColorStop(0, 'rgba(240, 246, 252, 0.090)');
      twistGrad.addColorStop(0.35, 'rgba(165, 180, 195, 0.060)');
      twistGrad.addColorStop(0.70, 'rgba(86, 215, 164, 0.045)'); // Emerald underside reflection
      twistGrad.addColorStop(1, 'rgba(5, 6, 8, 0.0)');
      ctx.fillStyle = twistGrad;
      ctx.fill();
      ctx.restore();

      // 5. FRACTURED VEIL — RIBBON C: Lower Transverse Horizon Wave
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.10, height + 30);
      ctx.bezierCurveTo(
        width * 0.35,
        height * 0.72 + wave * 0.6,
        width * 0.68,
        height * 0.64 - wave * 0.5,
        width + 20,
        height * 0.82
      );
      ctx.lineTo(width + 20, height + 30);
      ctx.closePath();

      const waveGrad = ctx.createLinearGradient(width * 0.25, height * 0.65, width * 0.85, height);
      waveGrad.addColorStop(0, 'rgba(180, 195, 210, 0.045)');
      waveGrad.addColorStop(0.40, 'rgba(225, 235, 245, 0.080)'); // Satin crest
      waveGrad.addColorStop(0.75, 'rgba(86, 215, 164, 0.035)'); // Subtle emerald caustics
      waveGrad.addColorStop(1, 'rgba(5, 6, 8, 0.0)');
      ctx.fillStyle = waveGrad;
      ctx.fill();
      ctx.restore();

      // 6. Fine Metallic Striations (Fluted curvature lines along upper & lower canopies)
      const striations = [
        { uOffset: -10, alpha: 0.065, width: 1.2 },
        { uOffset: 8, alpha: 0.095, width: 1.6 },
        { uOffset: 22, alpha: 0.070, width: 1.2 },
        { uOffset: 36, alpha: 0.045, width: 1.0 },
      ];

      striations.forEach(s => {
        // Upper canopy flutes
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(width * 0.44 + s.uOffset, -30);
        ctx.bezierCurveTo(
          width * 0.64 + s.uOffset * 0.8,
          height * 0.23 + wave + s.uOffset * 0.2,
          width * 0.85 + s.uOffset * 0.6,
          height * 0.53 - wave * 0.7 + s.uOffset * 0.15,
          width + 30,
          height * 0.84 + s.uOffset * 0.1
        );
        const strokeGrad = ctx.createLinearGradient(width * 0.46, 0, width, height * 0.80);
        strokeGrad.addColorStop(0, `rgba(240, 245, 250, ${s.alpha * 0.5})`);
        strokeGrad.addColorStop(0.35, `rgba(248, 250, 255, ${s.alpha})`);
        strokeGrad.addColorStop(0.70, `rgba(145, 162, 178, ${s.alpha * 0.4})`);
        strokeGrad.addColorStop(1, 'rgba(5, 6, 8, 0)');
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = s.width;
        ctx.stroke();
        ctx.restore();

        // Lower wave flutes
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(width * 0.12 + s.uOffset * 0.6, height + 20);
        ctx.bezierCurveTo(
          width * 0.36 + s.uOffset * 0.5,
          height * 0.73 + wave * 0.6 + s.uOffset * 0.2,
          width * 0.69 + s.uOffset * 0.4,
          height * 0.65 - wave * 0.5 + s.uOffset * 0.15,
          width + 20,
          height * 0.83
        );
        const strokeGradLower = ctx.createLinearGradient(width * 0.20, height * 0.70, width, height);
        strokeGradLower.addColorStop(0, `rgba(235, 242, 250, ${s.alpha * 0.3})`);
        strokeGradLower.addColorStop(0.40, `rgba(245, 248, 252, ${s.alpha * 0.7})`);
        strokeGradLower.addColorStop(1, 'rgba(5, 6, 8, 0)');
        ctx.strokeStyle = strokeGradLower;
        ctx.lineWidth = s.width * 0.9;
        ctx.stroke();
        ctx.restore();
      });

      // 7. Micro-Particle Living Current along Veil splines
      ctx.save();
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 4;
        let u = particles[idx];
        const laneOffset = particles[idx + 1];
        const speed = particles[idx + 2];
        const phase = particles[idx + 3];

        if (!prefersReducedMotion) {
          u += speed;
          if (u > 1) u -= 1;
          particles[idx] = u;
        }

        // 70% particles on spline 1 (upper canopy), 30% on spline 2 (lower wave)
        const isSpline1 = (i % 3 !== 0);
        const getPoint = isSpline1 ? getSpline1 : getSpline2;

        const pt = getPoint(u, time);
        const ptNext = getPoint(Math.min(1, u + 0.01), time);
        const dx = ptNext.x - pt.x;
        const dy = ptNext.y - pt.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const px = pt.x + nx * laneOffset;
        const py = pt.y + ny * laneOffset;

        const edgeFade = Math.sin(u * Math.PI);
        const twinkle = 0.6 + 0.4 * Math.sin(time * 3 + phase);
        const alpha = Math.max(0, Math.min(1, edgeFade * twinkle * 0.50));

        if (alpha > 0.02) {
          ctx.beginPath();
          const isEmerald = (i % 4 === 0);
          ctx.fillStyle = isEmerald
            ? `rgba(86, 215, 164, ${alpha * 0.90})`
            : `rgba(238, 245, 252, ${alpha})`;
          const r = isEmerald ? 1.4 : 1.0;
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="command-veil-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
