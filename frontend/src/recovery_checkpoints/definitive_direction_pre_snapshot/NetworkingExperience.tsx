import { useEffect, useState } from 'react';
import { Link } from '../router';
import api from '../api';
import {
  CURATED_SCENARIOS,
  adaptLiveTrafficEvent,
  ScenarioRecord,
  StageIndex,
} from './experience/scenarioData';
import { ExperienceStageCanvas } from './experience/ExperienceStageCanvas';
import { ExperienceInspector } from './experience/ExperienceInspector';
import { ExperiencePlaybackControls } from './experience/ExperiencePlaybackControls';
import './experience/experience.css';

export default function NetworkingExperience() {
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
    const duration = (2800 / speed);
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

  return (
    <div className="experience-page-root">
      {/* Top Header Rail */}
      <header className="experience-top-nav" role="banner">
        <div className="experience-brand">
          <Link href="/" className="brand-link" aria-label="Hyperion Home">
            <span className="brand-symbol">H</span>
            <span className="brand-title">HYPERION</span>
          </Link>
          <span className="experience-badge">INTERACTIVE NETWORKING ARCHITECTURE</span>
          <span className="experience-health-indicator">
            <span className={`dot ${isBackendOnline ? 'online' : 'offline'}`} />
            <span>{isBackendOnline ? 'LIVE API ATTACHED' : 'CONCEPTUAL DEMO'}</span>
          </span>
        </div>

        <nav className="experience-nav-links" aria-label="Platform Navigation">
          <Link href="/" className="nav-pill">
            Cinematic Home
          </Link>
          <Link href="/experience" className="nav-pill active">
            Explore
          </Link>
          <Link href="/watch" className="nav-pill">
            Watch
          </Link>
          <Link href="/command-center" className="nav-btn-command">
            Enter Command Center ↗
          </Link>
        </nav>
      </header>

      {/* Scenario Selection & Request Summary Strip */}
      <div className="experience-scenario-bar" role="region" aria-label="Request Scenario Selector">
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
              <span className={`method-indicator ${scen.method.toLowerCase()}`}>{scen.method}</span>
              <span>{scen.name}</span>
            </button>
          ))}

          {liveEvents.length > 0 && (
            <div className="live-events-dropdown-wrap">
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
                  <span>{scen.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="scenario-summary-box">
          <span className={`req-method ${activeScenario.method.toLowerCase()}`}>{activeScenario.method}</span>
          <span className="req-endpoint">{activeScenario.endpoint}</span>
          <span className={`provenance-tag ${activeScenario.provenance.toLowerCase()}`}>
            {activeScenario.provenance}
          </span>
        </div>
      </div>

      {/* Main Interactive Stage & Inspector Layout */}
      <main id="main" className="experience-main-layout">
        <ExperienceStageCanvas
          scenario={activeScenario}
          currentStage={currentStage}
          isPlaying={isPlaying}
          onSelectStage={handleSelectStage}
          decisionOverride={decisionOverride}
        />

        <ExperienceInspector
          scenario={activeScenario}
          currentStage={currentStage}
          decisionOverride={decisionOverride}
          onSetDecisionOverride={setDecisionOverride}
        />
      </main>

      {/* Deterministic Playback Controller */}
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
  );
}
