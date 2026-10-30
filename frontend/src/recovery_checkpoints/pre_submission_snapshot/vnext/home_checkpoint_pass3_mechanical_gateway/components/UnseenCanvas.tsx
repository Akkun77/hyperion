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

  // Pointer event listeners on window with stationary decay & coordinate normalization
  useEffect(() => {
    const handleMove = (e: MouseEvent | PointerEvent) => {
      if (!worldRef.current) return;
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const nx = (e.clientX / width) * 2 - 1;
      const ny = -((e.clientY / height) * 2 - 1);

      worldRef.current.setPointer(nx, ny, 0, 0, true);
    };

    const handleLeave = () => {
      if (worldRef.current) {
        worldRef.current.setPointer(0, 0, 0, 0, false);
      }
    };

    const eventName = window.PointerEvent ? 'pointermove' : 'mousemove';
    window.addEventListener(eventName, handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
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
