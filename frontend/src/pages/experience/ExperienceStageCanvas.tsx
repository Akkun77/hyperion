import React, { useEffect, useRef } from 'react';
import { ScenarioRecord, StageIndex } from './scenarioData';

interface ExperienceStageCanvasProps {
  scenario: ScenarioRecord;
  currentStage: StageIndex;
  isPlaying: boolean;
  onSelectStage: (stage: StageIndex) => void;
  decisionOverride?: 'ALLOW' | 'FLAG' | 'BLOCK' | null;
}

export const ExperienceStageCanvas: React.FC<ExperienceStageCanvasProps> = ({
  scenario,
  currentStage,
  isPlaying,
  onSelectStage,
  decisionOverride,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeDecision = decisionOverride || scenario.gatewayDecision;
  const isAllow = activeDecision === 'ALLOW';
  const isFlag = activeDecision === 'FLAG';
  const isBlock = activeDecision === 'BLOCK';

  const accentColor = isAllow ? '#53CE9A' : isFlag ? '#E9B969' : '#EB7777';

  // Smooth animation interpolation state
  const stageTargetRef = useRef(currentStage);
  const stageSmoothRef = useRef(currentStage);
  stageTargetRef.current = currentStage;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Smooth progress tracking
      if (prefersReducedMotion) {
        stageSmoothRef.current = stageTargetRef.current;
      } else {
        const lerpRate = 1.0 - Math.exp(-9.0 * dt);
        stageSmoothRef.current += (stageTargetRef.current - stageSmoothRef.current) * lerpRate;
      }

      const pStage = stageSmoothRef.current; // float in [0, 6]

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = rect.width;
      const h = rect.height;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Key spatial layout coordinates
      const cy = h * 0.42;
      const xClient = w * 0.12;
      const xGateway = w * 0.44;
      const xUpstream = w * 0.86;
      const xEvidence = w * 0.58;
      const yEvidence = h * 0.82;

      // -------------------------------------------------------------
      // 1. Perspective Background Coordinate Grid & Guides
      // -------------------------------------------------------------
      ctx.strokeStyle = 'rgba(52, 56, 62, 0.35)';
      ctx.lineWidth = 1;

      // Horizontal transit centerline
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.moveTo(w * 0.05, cy);
      ctx.lineTo(w * 0.95, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertical Gateway Aperture Axis
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(52, 56, 62, 0.45)';
      ctx.moveTo(xGateway, h * 0.12);
      ctx.lineTo(xGateway, h * 0.88);
      ctx.stroke();

      // Curved Evidence Branch Conduit (Gateway Core -> Evidence Sink)
      ctx.beginPath();
      ctx.strokeStyle = (isFlag || isBlock || pStage >= 5)
        ? (isFlag ? 'rgba(233, 185, 105, 0.35)' : isBlock ? 'rgba(235, 119, 119, 0.35)' : 'rgba(191, 195, 199, 0.25)')
        : 'rgba(52, 56, 62, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.moveTo(xGateway, cy);
      ctx.bezierCurveTo(xGateway, cy + 45, xEvidence - 40, yEvidence - 30, xEvidence, yEvidence);
      ctx.stroke();
      ctx.setLineDash([]);

      // Response Return Track (Upstream -> Client via upper rail)
      if (pStage >= 4 && !isBlock) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(83, 206, 154, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.moveTo(xUpstream, cy - 25);
        ctx.bezierCurveTo(xUpstream - 80, cy - 65, xGateway + 60, cy - 65, xGateway, cy - 35);
        ctx.bezierCurveTo(xGateway - 60, cy - 65, xClient + 80, cy - 65, xClient, cy - 25);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // -------------------------------------------------------------
      // 2. Active Transit Splines
      // -------------------------------------------------------------
      // Segment A: Client -> Gateway
      const clientActive = pStage >= 0;
      ctx.beginPath();
      ctx.lineWidth = clientActive ? 2.0 : 1.0;
      ctx.strokeStyle = clientActive ? '#BFC3C7' : 'rgba(52, 56, 62, 0.6)';
      ctx.moveTo(xClient, cy);
      ctx.lineTo(xGateway, cy);
      ctx.stroke();

      // Segment B: Gateway -> Upstream (Inactive when BLOCK!)
      const upstreamActive = (isAllow || isFlag) && pStage >= 3;
      ctx.beginPath();
      ctx.lineWidth = upstreamActive ? 2.5 : 1.0;
      if (isBlock) {
        ctx.strokeStyle = 'rgba(235, 119, 119, 0.15)';
        ctx.setLineDash([2, 8]);
      } else if (upstreamActive) {
        ctx.strokeStyle = isAllow ? 'rgba(83, 206, 154, 0.85)' : 'rgba(233, 185, 105, 0.85)';
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(52, 56, 62, 0.4)';
        ctx.setLineDash([]);
      }
      ctx.moveTo(xGateway, cy);
      ctx.lineTo(xUpstream, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // -------------------------------------------------------------
      // 3. Node 1: Client Ingress Hub (Left)
      // -------------------------------------------------------------
      const isClientTarget = pStage < 1.0;
      ctx.beginPath();
      ctx.arc(xClient, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#15171B';
      ctx.fill();
      ctx.lineWidth = isClientTarget ? 2 : 1;
      ctx.strokeStyle = isClientTarget ? '#F4F4F1' : '#34383E';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(xClient, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = isClientTarget ? '#F4F4F1' : '#BFC3C7';
      ctx.fill();

      // Client labels
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.fillStyle = isClientTarget ? '#F4F4F1' : '#BFC3C7';
      ctx.textAlign = 'center';
      ctx.fillText('CLIENT ORIGIN', xClient, cy - 28);

      ctx.font = '9px "Cascadia Code", monospace';
      ctx.fillStyle = '#8E939B';
      ctx.fillText(scenario.clientIp, xClient, cy + 34);

      // -------------------------------------------------------------
      // 4. Node 2: Gateway Aperture Core (:8000) (Center-Left)
      // -------------------------------------------------------------
      const isGatewayActive = pStage >= 1.0;
      const isAtGateway = pStage >= 1.0 && pStage <= 3.5;

      // Outer aperture ring
      ctx.beginPath();
      ctx.arc(xGateway, cy, 32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(21, 23, 27, 0.9)';
      ctx.fill();
      ctx.lineWidth = isAtGateway ? 2 : 1.5;
      ctx.strokeStyle = isAtGateway
        ? accentColor
        : isGatewayActive
          ? '#BFC3C7'
          : '#34383E';
      ctx.stroke();

      // Concentric evaluation disc
      ctx.beginPath();
      ctx.arc(xGateway, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = isAtGateway
        ? (isBlock ? 'rgba(235, 119, 119, 0.15)' : isFlag ? 'rgba(233, 185, 105, 0.15)' : 'rgba(83, 206, 154, 0.15)')
        : 'rgba(32, 36, 42, 0.4)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isAtGateway ? accentColor : 'rgba(52, 56, 62, 0.6)';
      ctx.stroke();

      // Core glyph
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillStyle = isAtGateway ? accentColor : '#F4F4F1';
      ctx.textAlign = 'center';
      ctx.fillText(isBlock && pStage >= 3 ? '✕' : isAllow && pStage >= 3 ? '✓' : isFlag && pStage >= 3 ? '!' : '◈', xGateway, cy + 4);

      // Gateway labels
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.fillStyle = isAtGateway ? '#F4F4F1' : '#BFC3C7';
      ctx.fillText('REVERSE PROXY', xGateway, cy - 42);

      ctx.font = '9px "Cascadia Code", monospace';
      ctx.fillStyle = isAtGateway ? accentColor : '#8E939B';
      ctx.fillText(`PORT 8000 // ${activeDecision}`, xGateway, cy + 48);

      // Blocked Barrier visual shockwave when BLOCK is active
      if (isBlock && pStage >= 2.8) {
        ctx.beginPath();
        ctx.arc(xGateway, cy, 38 + Math.sin(now * 0.006) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(235, 119, 119, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // 5. Node 3: Protected Upstream Citadel (:8001) (Right)
      // -------------------------------------------------------------
      const isUpstreamLit = (isAllow || isFlag) && pStage >= 3.8;
      ctx.beginPath();
      ctx.arc(xUpstream, cy, 24, 0, Math.PI * 2);
      ctx.fillStyle = isUpstreamLit ? 'rgba(83, 206, 154, 0.1)' : '#15171B';
      ctx.fill();
      ctx.lineWidth = isUpstreamLit ? 2 : 1;
      ctx.strokeStyle = isBlock
        ? 'rgba(235, 119, 119, 0.2)'
        : isUpstreamLit
          ? (isAllow ? '#53CE9A' : '#E9B969')
          : '#34383E';
      ctx.stroke();

      // Inner status glyph
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillStyle = isBlock ? '#6C727A' : isUpstreamLit ? '#F4F4F1' : '#8E939B';
      ctx.fillText(isBlock ? 'OFFLINE' : 'API', xUpstream, cy + 4);

      // Upstream labels
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.fillStyle = isUpstreamLit ? '#F4F4F1' : '#BFC3C7';
      ctx.fillText('PROTECTED UPSTREAM', xUpstream, cy - 36);

      ctx.font = '9px "Cascadia Code", monospace';
      ctx.fillStyle = isBlock ? '#EB7777' : isUpstreamLit ? (isAllow ? '#53CE9A' : '#E9B969') : '#8E939B';
      ctx.fillText(isBlock ? 'UNREACHED // ISOLATED' : `PORT 8001 // HTTP ${scenario.upstreamStatusCode || 200}`, xUpstream, cy + 42);

      // -------------------------------------------------------------
      // 6. Node 4: Recorded Evidence Repository (Bottom-Center)
      // -------------------------------------------------------------
      const isEvidenceActive = pStage >= 4.8;
      ctx.beginPath();
      ctx.rect(xEvidence - 40, yEvidence - 18, 80, 36);
      ctx.fillStyle = isEvidenceActive ? 'rgba(28, 32, 38, 0.95)' : 'rgba(21, 23, 27, 0.8)';
      ctx.fill();
      ctx.lineWidth = isEvidenceActive ? 1.5 : 1;
      ctx.strokeStyle = isEvidenceActive
        ? (isFlag ? '#E9B969' : isBlock ? '#EB7777' : '#BFC3C7')
        : '#34383E';
      ctx.stroke();

      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.fillStyle = isEvidenceActive ? '#F4F4F1' : '#BFC3C7';
      ctx.textAlign = 'center';
      ctx.fillText('EVIDENCE SINK', xEvidence, yEvidence - 26);

      ctx.font = '9px "Cascadia Code", monospace';
      ctx.fillStyle = isEvidenceActive ? '#F4F4F1' : '#8E939B';
      ctx.fillText(scenario.evidenceId, xEvidence, yEvidence + 4);

      ctx.font = '8px "Cascadia Code", monospace';
      ctx.fillStyle = '#8E939B';
      ctx.fillText(isEvidenceActive ? 'FORENSIC COMMITTED' : 'AWAITING DISPATCH', xEvidence, yEvidence + 28);

      // -------------------------------------------------------------
      // 7. Travelling Signal Protagonist Packet
      // -------------------------------------------------------------
      let signalX = xClient;
      let signalY = cy;
      let signalVisible = true;
      let signalColor = '#F4F4F1';
      const pulseRate = isPlaying ? 0.012 : 0.004;
      let signalGlow = 14 + Math.sin(now * pulseRate) * 3;

      if (pStage < 1.0) {
        // Client origin
        const t = pStage;
        signalX = xClient + (xGateway - xClient) * (t * 0.1);
        signalY = cy;
        signalColor = '#F4F4F1';
      } else if (pStage < 2.0) {
        // In transit: Client -> Gateway
        const t = (pStage - 1.0);
        signalX = xClient + (xGateway - xClient) * t;
        signalY = cy;
        signalColor = '#BFC3C7';
      } else if (pStage < 3.5) {
        // At Gateway Aperture (Policy Evaluation & Decision)
        signalX = xGateway;
        signalY = cy;
        signalColor = pStage > 2.8 ? accentColor : '#F4F4F1';
        signalGlow = 22;
      } else if (pStage < 5.0) {
        // Post-decision transit
        if (isBlock) {
          // Blocked: signal stays arrested at gateway barrier
          signalX = xGateway;
          signalY = cy;
          signalColor = '#EB7777';
          signalGlow = 24 + Math.sin(now * 0.01) * 6;
        } else {
          // Allowed or Flagged: travels from Gateway -> Upstream
          const t = (pStage - 3.5) / 1.5;
          signalX = xGateway + (xUpstream - xGateway) * t;
          signalY = cy;
          signalColor = accentColor;
        }
      } else {
        // Evidence / Investigation phase
        const t = Math.min(1.0, (pStage - 5.0) / 1.0);
        signalX = xGateway + (xEvidence - xGateway) * t;
        signalY = cy + (yEvidence - cy) * t;
        signalColor = accentColor;
        signalGlow = 18;
      }

      if (signalVisible) {
        // Outer aura glow
        const aura = ctx.createRadialGradient(signalX, signalY, 2, signalX, signalY, signalGlow);
        aura.addColorStop(0, signalColor);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(signalX, signalY, signalGlow, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(signalX, signalY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = signalColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [scenario, currentStage, activeDecision, isAllow, isFlag, isBlock, accentColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.25) {
      onSelectStage(0); // Client
    } else if (x < w * 0.40) {
      onSelectStage(1); // Gateway Ingress
    } else if (x < w * 0.55) {
      onSelectStage(2); // Policy
    } else if (x < w * 0.75) {
      onSelectStage(4); // Upstream
    } else {
      onSelectStage(5); // Evidence
    }
  };

  return (
    <div className="experience-stage-canvas-wrap">
      <div className="canvas-header-rail">
        <span className="rail-item">
          <span className="dot online" />
          <span>GATEWAY LISTENER // 0.0.0.0:8000</span>
        </span>
        <span className="rail-item">
          <span className="dot" style={{ backgroundColor: accentColor }} />
          <span>POLICY DECISION: {activeDecision}</span>
        </span>
        <span className="rail-item">
          <span>UPSTREAM SANCTUARY: {isBlock ? 'ISOLATED' : '127.0.0.1:8001'}</span>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="experience-stage-canvas"
        onClick={handleCanvasClick}
        aria-label="Interactive API Request Journey Architectural Canvas"
        role="region"
      />

      <div className="canvas-footnote-strip">
        <span>CLICK ANY NODE TO INSPECT STAGE</span>
        <span>GATEWAY INVARIANTS INDEPENDENT OF UPSTREAM RETURN CODE</span>
        <span>DETERMINISTIC PLAYBACK CONTROLLER BELOW</span>
      </div>
    </div>
  );
};
