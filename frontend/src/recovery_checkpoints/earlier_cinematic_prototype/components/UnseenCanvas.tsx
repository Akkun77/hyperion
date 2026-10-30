import React, { useEffect, useRef, useState } from 'react';
import { UnseenWorld } from '../scene/UnseenWorld';
import { DecisionMode, DebugTuningParams } from '../types';

interface UnseenCanvasProps {
  progress: number;
  decisionMode: DecisionMode;
  onDecisionChange?: (mode: DecisionMode) => void;
  isReducedMotion?: boolean;
  debugParams?: DebugTuningParams;
}

export const UnseenCanvas: React.FC<UnseenCanvasProps> = ({
  progress,
  decisionMode,
  isReducedMotion = false,
  debugParams,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<UnseenWorld | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Track pointer movements with robust velocity calculation & spike protection
  const lastPointerRef = useRef({
    x: 0,
    y: 0,
    time: 0,
    isEntering: true,
  });
  const stationaryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (stationaryTimerRef.current !== null) {
        window.clearTimeout(stationaryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }
    } catch {
      setWebglError(true);
      return;
    }

    try {
      const world = new UnseenWorld({
        container: containerRef.current,
        isReducedMotion,
        debugParams,
      });
      worldRef.current = world;

      return () => {
        world.dispose();
        worldRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize UnseenWorld:', err);
      setWebglError(true);
    }
  }, [isReducedMotion]);

  // Sync debug tuning params
  useEffect(() => {
    if (debugParams && worldRef.current) {
      worldRef.current.updateDebugParams(debugParams);
    }
  }, [debugParams]);

  // Sync scroll progress
  useEffect(() => {
    worldRef.current?.setProgress(progress);
  }, [progress]);

  // Sync decision mode
  useEffect(() => {
    worldRef.current?.setDecisionMode(decisionMode);
  }, [decisionMode]);

  // Pointer event listeners with spike-protection & stationary decay
  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    lastPointerRef.current = {
      x: nx,
      y: ny,
      time: performance.now(),
      isEntering: true,
    };
    worldRef.current?.setPointer(nx, ny, 0, 0, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !worldRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const now = performance.now();
    const last = lastPointerRef.current;
    const timeDelta = (now - last.time) / 1000;

    let vx = 0;
    let vy = 0;

    // Reject jumps from pointer-entry or pauses > 120ms
    if (!last.isEntering && last.time > 0 && timeDelta > 0.003 && timeDelta < 0.12) {
      vx = (nx - last.x) / timeDelta;
      vy = (ny - last.y) / timeDelta;
      // Clamp extreme spikes in normalized velocity
      const speed = Math.hypot(vx, vy);
      const maxNormSpeed = 15.0;
      if (speed > maxNormSpeed) {
        vx = (vx / speed) * maxNormSpeed;
        vy = (vy / speed) * maxNormSpeed;
      }
    }

    lastPointerRef.current = {
      x: nx,
      y: ny,
      time: now,
      isEntering: false,
    };

    worldRef.current.setPointer(nx, ny, vx, vy, true);

    // If mouse becomes stationary, clear velocity within 50ms
    if (stationaryTimerRef.current !== null) {
      window.clearTimeout(stationaryTimerRef.current);
    }
    stationaryTimerRef.current = window.setTimeout(() => {
      worldRef.current?.setPointer(nx, ny, 0, 0, true);
    }, 50);
  };

  const handlePointerLeave = () => {
    if (stationaryTimerRef.current !== null) {
      window.clearTimeout(stationaryTimerRef.current);
      stationaryTimerRef.current = null;
    }
    lastPointerRef.current = {
      x: 0,
      y: 0,
      time: 0,
      isEntering: true,
    };
    if (!worldRef.current) return;
    worldRef.current.setPointer(0, 0, 0, 0, false);
  };

  if (webglError) {
    return (
      <div className="unseen-canvas-fallback" role="img" aria-label="Hyperion Unseen Architecture Poster">
        <div className="unseen-poster-graphic" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="unseen-canvas-container"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-hidden="true"
    />
  );
};
