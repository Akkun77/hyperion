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

export interface DemoRequestTrace {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  callerIp: string;
  tokenUser: string;
  authType: string;
  gatewayDecision: DecisionMode;
  gatewayPort: number;
  upstreamTarget: string;
  statusCode: number;
  upstreamStatusCode: number | null;
  latencyMs: number;
  decisionReason: string;
  evidenceHash: string;
  findingTitle?: string;
  findingSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

export const REAL_DEMO_TRACES: Record<DecisionMode, DemoRequestTrace> = {
  ALLOW: {
    id: 'req_live_101',
    timestamp: '2026-10-28T05:30:12.440Z',
    method: 'GET',
    endpoint: '/api/v1/users/user_101',
    callerIp: '192.168.1.45',
    tokenUser: 'user_101',
    authType: 'Bearer JWT',
    gatewayDecision: 'ALLOW',
    gatewayPort: 8000,
    upstreamTarget: 'http://127.0.0.1:8001',
    statusCode: 200,
    upstreamStatusCode: 200,
    latencyMs: 1.2,
    decisionReason: 'Allowlisted route matched, identity authorized for owner resource',
    evidenceHash: 'SHA256:7f3b8901ac42e001',
  },
  FLAG: {
    id: 'req_live_202',
    timestamp: '2026-10-28T05:30:14.810Z',
    method: 'GET',
    endpoint: '/api/v1/users/user_202/balance',
    callerIp: '192.168.1.88',
    tokenUser: 'user_101',
    authType: 'Bearer JWT',
    gatewayDecision: 'FLAG',
    gatewayPort: 8000,
    upstreamTarget: 'http://127.0.0.1:8001',
    statusCode: 403,
    upstreamStatusCode: 403,
    latencyMs: 1.8,
    decisionReason: 'BOLA discrepancy: user_101 attempting to access user_202 account balance',
    evidenceHash: 'SHA256:b41e892ef600d884',
    findingTitle: 'BOLA_CROSS_ACCOUNT_ACCESS',
    findingSeverity: 'high',
  },
  BLOCK: {
    id: 'req_live_303',
    timestamp: '2026-10-28T05:30:16.120Z',
    method: 'POST',
    endpoint: '/api/v1/payments',
    callerIp: '10.0.4.12',
    tokenUser: 'unauthenticated',
    authType: 'None',
    gatewayDecision: 'BLOCK',
    gatewayPort: 8000,
    upstreamTarget: 'NOT REACHED (Intercepted at Gateway Perimeter)',
    statusCode: 429,
    upstreamStatusCode: null,
    latencyMs: 0.4,
    decisionReason: 'Rate limit boundary exceeded: 120 req/s from untrusted origin',
    evidenceHash: 'SHA256:9c102df01a8bb390',
    findingTitle: 'RATE_LIMIT_EXCEEDED',
    findingSeverity: 'critical',
  },
};
