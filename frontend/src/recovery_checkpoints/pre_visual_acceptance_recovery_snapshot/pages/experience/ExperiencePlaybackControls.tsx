import React from 'react';
import { STAGES, StageIndex } from './scenarioData';

interface ExperiencePlaybackControlsProps {
  currentStage: StageIndex;
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  onReplay: () => void;
  onSelectStage: (stage: StageIndex) => void;
  onChangeSpeed: (speed: number) => void;
}

export const ExperiencePlaybackControls: React.FC<ExperiencePlaybackControlsProps> = ({
  currentStage,
  isPlaying,
  speed,
  onPlayPause,
  onStepPrev,
  onStepNext,
  onReplay,
  onSelectStage,
  onChangeSpeed,
}) => {
  return (
    <footer className="experience-controls-root" role="region" aria-label="Playback Controller">
      {/* 7-Stage Progression Track */}
      <div className="stage-progress-track">
        {STAGES.map((stage) => {
          const isActive = stage.index === currentStage;
          const isPassed = stage.index < currentStage;
          return (
            <button
              key={stage.index}
              type="button"
              className={`stage-pill ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
              onClick={() => onSelectStage(stage.index)}
              aria-current={isActive ? 'step' : undefined}
              title={`Stage ${stage.index + 1}: ${stage.title} — ${stage.tagline}`}
            >
              <span className="stage-index">0{stage.index + 1}</span>
              <span className="stage-name">{stage.title}</span>
              <span className="stage-pip" />
            </button>
          );
        })}
      </div>

      {/* Playback Action Buttons */}
      <div className="playback-action-strip">
        <div className="button-group">
          <button
            type="button"
            className="ctrl-btn"
            onClick={onReplay}
            aria-label="Replay Request Journey from Stage 1"
            title="Replay from start"
          >
            <span className="icon">↺</span>
            <span className="btn-label">Replay</span>
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={onStepPrev}
            disabled={currentStage === 0}
            aria-label="Step Backward"
            title="Previous Stage"
          >
            <span className="icon">←</span>
            <span className="btn-label">Previous</span>
          </button>

          <button
            type="button"
            className={`ctrl-btn primary-play ${isPlaying ? 'is-playing' : ''}`}
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause Playback' : 'Play Request Journey'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="icon">{isPlaying ? '⏸' : '▶'}</span>
            <span className="btn-label">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={onStepNext}
            disabled={currentStage === 6}
            aria-label="Step Forward"
            title="Next Stage"
          >
            <span className="btn-label">Next</span>
            <span className="icon">→</span>
          </button>
        </div>

        {/* Playback Speed Selector */}
        <div className="speed-selector" role="group" aria-label="Playback Speed">
          <span className="speed-label">SPEED:</span>
          {[0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              type="button"
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onChangeSpeed(s)}
              aria-pressed={speed === s}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="stage-indicator-badge">
          <span className="current-label">STAGE {currentStage + 1} / 7</span>
          <span className="current-title">{STAGES[currentStage]?.title.toUpperCase()}</span>
        </div>
      </div>
    </footer>
  );
};
