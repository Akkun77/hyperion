export type ActIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface ActDefinition {
  id: string;
  actNumber: string;
  name: string;
  range: [number, number];
  title: string;
  subtitle: string;
  microAnnotation?: string;
}

export type DecisionMode = 'ALLOW' | 'FLAG' | 'BLOCK';

export interface UnseenPointerState {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1
  vx: number; // Velocity x
  vy: number; // Velocity y
  speed: number;
  active: boolean;
}

export interface UnseenScrollState {
  progress: number; // 0.0 to 1.0
  targetProgress: number;
  currentAct: ActIndex;
  direction: 1 | -1;
  isReducedMotion: boolean;
}

export interface DebugTuningParams {
  flowSpeed: number; // 0.1 - 3.0
  mouseForce: number; // 0.1 - 4.0
  mouseSwirl: number; // 0.1 - 3.0
  mouseRadius: number; // 1.0 - 8.0
  damping: number; // 0.70 - 0.98
}

export const DEFAULT_DEBUG_PARAMS: DebugTuningParams = {
  flowSpeed: 1.0,
  mouseForce: 1.2,
  mouseSwirl: 1.4,
  mouseRadius: 3.8,
  damping: 0.90,
};
