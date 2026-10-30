import { useEffect, useRef } from 'react';
import { CinematicWatchWorld, DecisionMode, RenderMode } from '../scene/CinematicWatchWorld';

interface CinematicWatchCanvasProps {
  progress: number;
  decisionMode: DecisionMode;
  renderMode?: RenderMode;
  isReducedMotion?: boolean;
  onSignalPositionUpdate?: (pos: { x: number; y: number }) => void;
}

export function CinematicWatchCanvas({
  progress,
  decisionMode,
  renderMode = 'both',
  isReducedMotion = false,
  onSignalPositionUpdate,
}: CinematicWatchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<CinematicWatchWorld | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const world = new CinematicWatchWorld({
      container,
      isReducedMotion,
      renderMode,
    });
    worldRef.current = world;

    // Periodic callback for screen position of protagonist signal entity
    let frameId: number;
    const pollSignalPos = () => {
      if (worldRef.current && onSignalPositionUpdate) {
        const pos = worldRef.current.getSignalScreenPosition();
        onSignalPositionUpdate(pos);
      }
      frameId = requestAnimationFrame(pollSignalPos);
    };
    if (onSignalPositionUpdate) {
      frameId = requestAnimationFrame(pollSignalPos);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      world.dispose();
      worldRef.current = null;
    };
  }, [isReducedMotion]);

  // Update progress
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.setProgress(progress);
    }
  }, [progress]);

  // Update decision mode
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.setDecisionMode(decisionMode);
    }
  }, [decisionMode]);

  // Update render mode
  useEffect(() => {
    if (worldRef.current && renderMode) {
      worldRef.current.setRenderMode(renderMode);
    }
  }, [renderMode]);

  return (
    <div
      ref={containerRef}
      className="cinematic-watch-canvas-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
