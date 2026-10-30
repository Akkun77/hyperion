import { useEffect, useRef, useState, useCallback } from 'react';
import { CinematicWatchCanvas } from './CinematicWatchCanvas';
import { CinematicWatchOverlay } from './CinematicWatchOverlay';
import { DecisionMode } from '../scene/CinematicWatchWorld';
import { NETWORK_SCENARIOS, NetworkScenario } from '../types';
import api from '../../../api';
import '../watch.css';

export function WatchExperience() {
  const [progress, setProgress] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scenario, setScenario] = useState<NetworkScenario>(NETWORK_SCENARIOS[0]);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('ALLOW');
  const [signalPos, setSignalPos] = useState<{ x: number; y: number } | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const lastTimeRef = useRef<number>(performance.now());
  const loopDwellRef = useRef<number | null>(null);

  // Probe backend health for live gateway indicator
  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const res = await api.health();
        if (active && res.status === 'ok') setIsBackendOnline(true);
      } catch {
        if (active) setIsBackendOnline(false);
      }
    };
    probe();
    return () => { active = false; };
  }, []);

  // Motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Continuous Playback Animation Loop
  useEffect(() => {
    let frameId: number;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (isPlaying && !isReducedMotion) {
        setProgress((prev) => {
          // Playback speed: full loop in ~12 seconds
          const speed = 0.082;
          let next = prev + dt * speed;

          // End of loop dwell and restart
          if (next >= 1.0) {
            next = 1.0;
            if (!loopDwellRef.current) {
              loopDwellRef.current = window.setTimeout(() => {
                setProgress(0.0);
                loopDwellRef.current = null;
              }, 1200);
            }
          }
          return Math.min(1.0, next);
        });
      }

      frameId = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      if (loopDwellRef.current) {
        clearTimeout(loopDwellRef.current);
        loopDwellRef.current = null;
      }
    };
  }, [isPlaying, isReducedMotion]);

  // Handle Scenario Selection
  const handleSelectScenario = useCallback((sc: NetworkScenario) => {
    setScenario(sc);
    setDecisionMode(sc.decision);
    setProgress(0.0);
    setIsPlaying(true);
    if (loopDwellRef.current) {
      clearTimeout(loopDwellRef.current);
      loopDwellRef.current = null;
    }
  }, []);

  // Handle Decision Mode Override
  const handleSelectDecisionMode = useCallback((mode: DecisionMode) => {
    setDecisionMode(mode);
  }, []);

  // Handle Play/Pause
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    if (loopDwellRef.current) {
      clearTimeout(loopDwellRef.current);
      loopDwellRef.current = null;
    }
  }, []);

  // Handle Replay
  const handleReplay = useCallback(() => {
    setProgress(0.0);
    setIsPlaying(true);
    if (loopDwellRef.current) {
      clearTimeout(loopDwellRef.current);
      loopDwellRef.current = null;
    }
  }, []);

  // Handle Step Forward/Backward
  const handleStep = useCallback((direction: number) => {
    setIsPlaying(false);
    setProgress((prev) => Math.max(0, Math.min(1, prev + direction * 0.08)));
    if (loopDwellRef.current) {
      clearTimeout(loopDwellRef.current);
      loopDwellRef.current = null;
    }
  }, []);

  // Handle Direct Scrubber Scrub
  const handleProgressChange = useCallback((p: number) => {
    setIsPlaying(false);
    setProgress(Math.max(0, Math.min(1, p)));
    if (loopDwellRef.current) {
      clearTimeout(loopDwellRef.current);
      loopDwellRef.current = null;
    }
  }, []);

  return (
    <div className="hyperion-watch-experience-root">
      {/* 3D WebGL Canvas Stage */}
      <CinematicWatchCanvas
        progress={progress}
        decisionMode={decisionMode}
        renderMode="both"
        isReducedMotion={isReducedMotion}
        onSignalPositionUpdate={setSignalPos}
      />

      {/* Cinematic HUD Overlay */}
      <CinematicWatchOverlay
        progress={progress}
        isPlaying={isPlaying}
        decisionMode={decisionMode}
        scenario={scenario}
        scenarios={NETWORK_SCENARIOS}
        signalPos={signalPos}
        isBackendOnline={isBackendOnline}
        onProgressChange={handleProgressChange}
        onTogglePlay={handleTogglePlay}
        onReplay={handleReplay}
        onStep={handleStep}
        onSelectScenario={handleSelectScenario}
        onSelectDecisionMode={handleSelectDecisionMode}
      />
    </div>
  );
}

export default WatchExperience;
