import { useEffect, useRef } from 'react';

/**
 * Lightweight, low-cost contextual fragment of The Fractured Veil
 * rendered behind the Command Center observatory shell.
 * Provides artistic continuity with the homepage without competing with operational data.
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

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Statically positioned, slowly breathing organic ribbon paths
    let time = 0;
    const render = () => {
      time += 0.005;
      ctx.clearRect(0, 0, width, height);

      // Deep void background
      ctx.fillStyle = '#07080A';
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric radial glow
      const grad = ctx.createRadialGradient(
        width * 0.75,
        height * 0.25,
        50,
        width * 0.75,
        height * 0.25,
        width * 0.6
      );
      grad.addColorStop(0, 'rgba(42, 46, 56, 0.18)');
      grad.addColorStop(0.5, 'rgba(17, 20, 24, 0.08)');
      grad.addColorStop(1, 'rgba(7, 8, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Ribbon Fold 1: Upper Canopy Fragment
      ctx.save();
      ctx.beginPath();
      const wave1 = Math.sin(time * 0.8) * 15;
      ctx.moveTo(width * 0.25, -50);
      ctx.bezierCurveTo(
        width * 0.45,
        height * 0.2 + wave1,
        width * 0.75,
        height * 0.15 - wave1,
        width + 50,
        height * 0.35
      );
      ctx.lineTo(width + 50, -50);
      ctx.closePath();

      const ribbonGrad1 = ctx.createLinearGradient(width * 0.3, 0, width * 0.9, height * 0.3);
      ribbonGrad1.addColorStop(0, 'rgba(174, 184, 192, 0.06)');
      ribbonGrad1.addColorStop(0.4, 'rgba(243, 244, 241, 0.10)');
      ribbonGrad1.addColorStop(0.8, 'rgba(33, 38, 45, 0.04)');
      ribbonGrad1.addColorStop(1, 'rgba(7, 8, 10, 0.0)');
      ctx.fillStyle = ribbonGrad1;
      ctx.fill();
      ctx.restore();

      // Ribbon Fold 2: Core Aperture Monolith Curve (Upper Right to Midground)
      ctx.save();
      ctx.beginPath();
      const wave2 = Math.cos(time * 0.6) * 18;
      ctx.moveTo(width * 0.55, height * 0.05);
      ctx.bezierCurveTo(
        width * 0.85 + wave2,
        height * 0.25,
        width * 0.92,
        height * 0.65 + wave2,
        width * 0.65,
        height * 0.85
      );
      ctx.bezierCurveTo(
        width * 0.50,
        height * 0.95,
        width * 0.40,
        height * 0.80,
        width * 0.48,
        height * 0.60
      );
      ctx.bezierCurveTo(
        width * 0.62,
        height * 0.40,
        width * 0.68,
        height * 0.18,
        width * 0.55,
        height * 0.05
      );
      ctx.closePath();

      const ribbonGrad2 = ctx.createLinearGradient(width * 0.5, height * 0.2, width * 0.95, height * 0.7);
      ribbonGrad2.addColorStop(0, 'rgba(243, 244, 241, 0.08)');
      ribbonGrad2.addColorStop(0.3, 'rgba(174, 184, 192, 0.12)');
      ribbonGrad2.addColorStop(0.7, 'rgba(27, 32, 37, 0.05)');
      ribbonGrad2.addColorStop(1, 'rgba(7, 8, 10, 0)');
      ctx.fillStyle = ribbonGrad2;
      ctx.fill();

      // Knife-edge rim highlight
      ctx.strokeStyle = 'rgba(243, 244, 241, 0.16)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Soft suspended micro-matter ambient dots
      ctx.fillStyle = 'rgba(243, 244, 241, 0.25)';
      for (let i = 0; i < 28; i++) {
        const px = (Math.sin(i * 137.5 + time * 0.2) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 92.3 + time * 0.15) * 0.5 + 0.5) * height;
        const r = 0.8 + (i % 3) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
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
