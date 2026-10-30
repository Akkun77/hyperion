import React, { useEffect, useState } from 'react';
import { Link } from '../../router';
import api from '../../api';
import {
  CURATED_SCENARIOS,
  adaptLiveTrafficEvent,
  ScenarioRecord,
  StageIndex,
} from './scenarioData';
import { ExperienceStageCanvas } from './ExperienceStageCanvas';
import { ExperienceInspector } from './ExperienceInspector';
import { ExperiencePlaybackControls } from './ExperiencePlaybackControls';
import './experience.css';

interface RequestJourneyExperienceProps {
  isEmbedded?: boolean;
}

export const RequestJourneyExperience: React.FC<RequestJourneyExperienceProps> = ({
  isEmbedded = false,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('legitimate');
  const [liveEvents, setLiveEvents] = useState<ScenarioRecord[]>([]);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<StageIndex>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [decisionOverride, setDecisionOverride] = useState<'ALLOW' | 'FLAG' | 'BLOCK' | null>(null);

  // Probe backend health & load recent recorded traffic if available
  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const health = await api.health();
        if (active && health.status === 'ok') {
          setIsBackendOnline(true);
          const events = await api.getTrafficEvents(0, 8);
          if (active && Array.isArray(events) && events.length > 0) {
            const adapted = events.map(adaptLiveTrafficEvent);
            setLiveEvents(adapted);
          }
        }
      } catch {
        if (active) {
          setIsBackendOnline(false);
        }
      }
    };
    probe();
    return () => { active = false; };
  }, []);

  // Combine curated and live scenarios
  const allScenarios = [...CURATED_SCENARIOS, ...liveEvents];
  const activeScenario = allScenarios.find((s) => s.id === selectedScenarioId) || CURATED_SCENARIOS[0];

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    // Normal stage duration is 2.8s divided by speed
    const duration = 2800 / speed;
    const timer = setTimeout(() => {
      setCurrentStage((prev) => {
        if (prev < 6) {
          return (prev + 1) as StageIndex;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStage, speed]);

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    setCurrentStage(0);
    setIsPlaying(false);
    setDecisionOverride(null);
  };

  const handlePlayPause = () => {
    if (currentStage === 6 && !isPlaying) {
      setCurrentStage(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentStage((prev) => Math.max(0, prev - 1) as StageIndex);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentStage((prev) => Math.min(6, prev + 1) as StageIndex);
  };

  const handleReplay = () => {
    setCurrentStage(0);
    setIsPlaying(true);
  };

  const handleSelectStage = (stage: StageIndex) => {
    setIsPlaying(false);
    setCurrentStage(stage);
  };

  const activeDecision = decisionOverride || activeScenario.gatewayDecision;

  return (
    <div className={`request-journey-root ${isEmbedded ? 'embedded-mode' : 'standalone-mode'}`} id="explanation-stage">
      {/* Editorial Introduction */}
      <div className="journey-editorial-header">
        <div className="journey-eyebrow">
          <span className="eyebrow-pip" />
          <span>EXPERIENCE B // THE REQUEST JOURNEY</span>
          <span className="health-tag">
            <span className={`status-dot ${isBackendOnline ? 'online' : 'offline'}`} />
            <span>{isBackendOnline ? 'LIVE GATEWAY ATTACHED (:8000)' : 'SYNTHESIZED SIMULATION'}</span>
          </span>
        </div>
        <h2 className="journey-title">WITNESS THE REQUEST JOURNEY.</h2>
        <p className="journey-subtitle">
          Follow an HTTP transaction as it strikes the reverse proxy gateway on port 8000,
          evaluates policy invariants, and reaches or is intercepted before reaching protected upstream APIs.
        </p>
      </div>

      {/* Scenario Selection Strip */}
      <div className="journey-scenario-strip" role="region" aria-label="Request Scenario Selector">
        <div className="scenario-label-wrap">
          <span className="scenario-label-tag">SELECT SCENARIO:</span>
        </div>
        <div className="scenario-pills-list" role="tablist" aria-label="Selectable API Request Scenarios">
          {CURATED_SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              type="button"
              role="tab"
              aria-selected={scen.id === activeScenario.id}
              className={`scenario-pill ${scen.id === activeScenario.id ? 'active' : ''}`}
              onClick={() => handleSelectScenario(scen.id)}
            >
              <span className={`method-badge ${scen.method.toLowerCase()}`}>{scen.method}</span>
              <span className="scen-name">{scen.name}</span>
              <span className={`decision-pill-mini ${scen.gatewayDecision.toLowerCase()}`}>
                {scen.gatewayDecision}
              </span>
            </button>
          ))}

          {liveEvents.length > 0 && (
            <div className="live-events-group">
              <span className="live-divider">|</span>
              {liveEvents.map((scen) => (
                <button
                  key={scen.id}
                  type="button"
                  role="tab"
                  aria-selected={scen.id === activeScenario.id}
                  className={`scenario-pill live-pill ${scen.id === activeScenario.id ? 'active' : ''}`}
                  onClick={() => handleSelectScenario(scen.id)}
                >
                  <span className="live-dot" />
                  <span className="method-badge">{scen.method}</span>
                  <span className="scen-name mono">{scen.endpoint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Architectural Canvas Stage */}
      <div className="journey-stage-shell">
        <div className="journey-canvas-viewport">
          <ExperienceStageCanvas
            scenario={activeScenario}
            currentStage={currentStage}
            isPlaying={isPlaying}
            onSelectStage={handleSelectStage}
            decisionOverride={decisionOverride}
          />
        </div>

        {/* Technical Inspector Drawer */}
        <div className="journey-inspector-viewport">
          <ExperienceInspector
            scenario={activeScenario}
            currentStage={currentStage}
            decisionOverride={decisionOverride}
            onSetDecisionOverride={setDecisionOverride}
          />
        </div>
      </div>

      {/* Reversible Deterministic Playback Controller */}
      <div className="journey-playback-shell">
        <ExperiencePlaybackControls
          currentStage={currentStage}
          isPlaying={isPlaying}
          speed={speed}
          onPlayPause={handlePlayPause}
          onStepPrev={handleStepPrev}
          onStepNext={handleStepNext}
          onReplay={handleReplay}
          onSelectStage={handleSelectStage}
          onChangeSpeed={setSpeed}
        />
      </div>

      {/* Decision Summary & Investigation Link Strip */}
      <div className="journey-footer-action-strip">
        <div className="action-summary-cell">
          <span className="cell-label">CURRENT POLICY ACTION:</span>
          <span className={`cell-val mono bold ${activeDecision.toLowerCase()}`}>
            {activeDecision} // {activeDecision === 'ALLOW' ? '200 OK (Forwarded)' : activeDecision === 'FLAG' ? '403 Forbidden (Audited)' : '429 Rate Limit (Intercepted)'}
          </span>
        </div>
        <div className="action-summary-cell">
          <span className="cell-label">UPSTREAM STATUS:</span>
          <span className="cell-val mono">
            {activeDecision === 'BLOCK' ? 'ISOLATED // ZERO UPSTREAM ACCESS' : `REACHED // HTTP ${activeScenario.upstreamStatusCode || 200}`}
          </span>
        </div>
        <div className="action-summary-cell">
          <span className="cell-label">IMMUTABLE EVIDENCE:</span>
          <span className="cell-val mono">
            {activeScenario.evidenceId} (SHA-256)
          </span>
        </div>
        <div className="action-buttons-cell">
          <Link href="/command-center" className="journey-cta-btn primary">
            Open in Command Center <span className="arrow-glyph">→</span>
          </Link>
          <Link href="/command-center/gateway" className="journey-cta-btn secondary">
            Inspect Gateway Policies ↗
          </Link>
        </div>
      </div>
    </div>
  );
};
