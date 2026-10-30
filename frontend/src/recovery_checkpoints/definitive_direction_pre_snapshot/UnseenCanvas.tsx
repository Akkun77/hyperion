import React, { useEffect, useRef, useState } from 'react';
import { UnseenWorld, RenderMode } from '../scene/UnseenWorld';
import { DecisionMode, DebugTuningParams } from '../types';

interface UnseenCanvasProps {
  progress: number;
  decisionMode: DecisionMode;
  onDecisionChange?: (mode: DecisionMode) => void;
  isReducedMotion?: boolean;
  debugParams?: DebugTuningParams;
  renderMode?: RenderMode;
}

export const UnseenCanvas: React.FC<UnseenCanvasProps> = ({
  progress,
  decisionMode,
  isReducedMotion = false,
  debugParams,
  renderMode = 'particles',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<UnseenWorld | null>(null);
  const [webglError, setWebglError] = useState(false);

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
        renderMode,
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

  // Sync render mode
  useEffect(() => {
    if (worldRef.current && renderMode) {
      worldRef.current.setRenderMode(renderMode);
    }
  }, [renderMode]);

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

  // Pointer event listeners on window with accurate velocity tracking & coordinate normalization
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let isMoving = false;
    let stopTimer: number | null = null;

    const handleMove = (e: MouseEvent | PointerEvent) => {
      if (!worldRef.current) return;
      const now = performance.now();
      const dt = lastTime > 0 ? Math.max(0.008, (now - lastTime) / 1000) : 0.016;

      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const nx = (e.clientX / width) * 2 - 1;
      const ny = -((e.clientY / height) * 2 - 1);

      let vx = 0;
      let vy = 0;
      if (lastTime > 0) {
        // Normalized velocity in screen space units per second
        vx = ((e.clientX - lastX) / width) / dt;
        vy = -(((e.clientY - lastY) / height) / dt);
      }

      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;
      isMoving = true;

      worldRef.current.setPointer(nx, ny, vx, vy, true);

      // Stationary decay: if mouse stops moving for > 60ms, clear velocity so zero energy is injected
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
      stopTimer = window.setTimeout(() => {
        if (worldRef.current && isMoving) {
          worldRef.current.setPointer(nx, ny, 0, 0, true);
        }
      }, 60);
    };

    const handleLeave = () => {
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
        stopTimer = null;
      }
      isMoving = false;
      lastTime = 0;
      if (worldRef.current) {
        worldRef.current.setPointer(0, 0, 0, 0, false);
      }
    };

    const eventName = window.PointerEvent ? 'pointermove' : 'mousemove';
    window.addEventListener(eventName, handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      if (stopTimer !== null) window.clearTimeout(stopTimer);
      window.removeEventListener(eventName, handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

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
      aria-hidden="true"
    />
  );
};
