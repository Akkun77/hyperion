import { useEffect, useRef, useState, useCallback } from 'react';
import { UnseenCanvas } from './components/UnseenCanvas';
import { UnseenOverlay } from './components/UnseenOverlay';
import { ActIndex, DecisionMode, DebugTuningParams, DEFAULT_DEBUG_PARAMS } from './types';
import { RenderMode } from './scene/UnseenWorld';
import './unseen-home.css';

export default function UnseenHome() {
  const [progress, setProgress] = useState(0);
  const [currentAct, setCurrentAct] = useState<ActIndex>(0);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('ALLOW');
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [debugParams, setDebugParams] = useState<DebugTuningParams>(DEFAULT_DEBUG_PARAMS);
  const [showDebug, setShowDebug] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>('both');
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Probe backend health to ensure accurate online/offline indicator
  useEffect(() => {
    let active = true;
    const probeHealth = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/health', { method: 'GET' });
        if (active && res.ok) setIsBackendOnline(true);
      } catch {
        if (active) setIsBackendOnline(false);
      }
    };
    probeHealth();
    return () => { active = false; };
  }, []);

  // Check URL query parameters for ?debug=1 and ?mode=mesh|particles|both
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setShowDebug(urlParams.get('debug') === '1');
      const modeParam = urlParams.get('mode');
      if (modeParam === 'mesh' || modeParam === 'particles' || modeParam === 'both') {
        setRenderMode(modeParam);
      }
    }
  }, []);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Sync scroll progress
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const rawProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
        const normProgress = Math.max(0, Math.min(1, rawProgress));

        setProgress(normProgress);

        // Derive current act index with non-overlapping boundaries
        let act: ActIndex = 0;
        if (normProgress >= 0.85) act = 5;
        else if (normProgress >= 0.67) act = 4;
        else if (normProgress >= 0.50) act = 3;
        else if (normProgress >= 0.32) act = 2;
        else if (normProgress >= 0.15) act = 1;

        setCurrentAct(act);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Jump to specific act
  const handleJumpToAct = useCallback((act: ActIndex) => {
    const actTargets: Record<ActIndex, number> = {
      0: 0.0,
      1: 0.22,
      2: 0.42,
      3: 0.58,
      4: 0.76,
      5: 0.96,
    };
    const targetP = actTargets[act];
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetScrollY = targetP * maxScroll;

    window.scrollTo({
      top: targetScrollY,
      behavior: isReducedMotion ? 'auto' : 'smooth',
    });
  }, [isReducedMotion]);

  return (
    <main className="unseen-home-container" ref={containerRef}>
      {/* 3D WebGL Canvas Rendering The Fractured Veil */}
      <UnseenCanvas
        progress={progress}
        decisionMode={decisionMode}
        onDecisionChange={setDecisionMode}
        isReducedMotion={isReducedMotion}
        debugParams={debugParams}
        renderMode={renderMode}
      />

      {/* Typographic & Interactive Narrative Overlay */}
      <UnseenOverlay
        progress={progress}
        currentAct={currentAct}
        decisionMode={decisionMode}
        onSelectDecision={setDecisionMode}
        onJumpToAct={handleJumpToAct}
        isBackendOnline={isBackendOnline}
      />

      {/* Invisible Scroll Track Driving Normalized Progress */}
      <div className="unseen-scroll-driver" aria-hidden="true" />

      {/* Hidden Debug Tuning Panel — Rendered ONLY behind ?debug=1 */}
      {showDebug && (
        <aside className="unseen-debug-panel" aria-label="Particle Simulation Tuner">
          <div className="debug-panel-header">
            <span className="debug-title">SIMULATION TUNER [DEBUG]</span>
            <button
              type="button"
              className="debug-reset-btn"
              onClick={() => setDebugParams(DEFAULT_DEBUG_PARAMS)}
            >
              Reset
            </button>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Flow Speed: {debugParams.flowSpeed.toFixed(2)}</span>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={debugParams.flowSpeed}
                onChange={(e) =>
                  setDebugParams((prev) => ({ ...prev, flowSpeed: parseFloat(e.target.value) }))
                }
              />
            </label>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Mouse Force: {debugParams.mouseForce.toFixed(2)}</span>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                value={debugParams.mouseForce}
                onChange={(e) =>
                  setDebugParams((prev) => ({ ...prev, mouseForce: parseFloat(e.target.value) }))
                }
              />
            </label>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Mouse Swirl: {debugParams.mouseSwirl.toFixed(2)}</span>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={debugParams.mouseSwirl}
                onChange={(e) =>
                  setDebugParams((prev) => ({ ...prev, mouseSwirl: parseFloat(e.target.value) }))
                }
              />
            </label>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Influence Radius: {debugParams.mouseRadius.toFixed(1)}</span>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.2"
                value={debugParams.mouseRadius}
                onChange={(e) =>
                  setDebugParams((prev) => ({ ...prev, mouseRadius: parseFloat(e.target.value) }))
                }
              />
            </label>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Damping: {debugParams.damping.toFixed(2)}</span>
              <input
                type="range"
                min="0.70"
                max="0.98"
                step="0.01"
                value={debugParams.damping}
                onChange={(e) =>
                  setDebugParams((prev) => ({ ...prev, damping: parseFloat(e.target.value) }))
                }
              />
            </label>
          </div>

          <div className="debug-control-group">
            <label>
              <span>Sculpture Mode: {renderMode.toUpperCase()}</span>
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                className={`decision-tab-pill ${renderMode === 'mesh' ? 'is-active' : ''}`}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', flex: 1 }}
                onClick={() => setRenderMode('mesh')}
              >
                Mesh
              </button>
              <button
                type="button"
                className={`decision-tab-pill ${renderMode === 'particles' ? 'is-active' : ''}`}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', flex: 1 }}
                onClick={() => setRenderMode('particles')}
              >
                Particles
              </button>
              <button
                type="button"
                className={`decision-tab-pill ${renderMode === 'both' ? 'is-active' : ''}`}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', flex: 1 }}
                onClick={() => setRenderMode('both')}
              >
                Both
              </button>
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}
