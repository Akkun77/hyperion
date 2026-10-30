import { APITrafficEvent } from '../../types';

export type StageIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface StageDescriptor {
  index: StageIndex;
  title: string;
  tagline: string;
  shortDesc: string;
  location: string;
}

export const STAGES: StageDescriptor[] = [
  {
    index: 0,
    title: 'Client Ingress',
    tagline: 'HTTP Origin Arrival',
    shortDesc: 'A client dispatches an HTTP request across the untrusted network. The payload is addressed to port 8000.',
    location: 'Ingress Terminal (Client)',
  },
  {
    index: 1,
    title: 'Reverse Proxy Gateway',
    tagline: 'Listener on Port 8000',
    shortDesc: 'Hyperion’s reverse proxy intercepts the connection. Method, route pattern, and headers are parsed and bound.',
    location: 'Gateway Core (:8000)',
  },
  {
    index: 2,
    title: 'Policy Evaluation',
    tagline: 'Invariant Checks',
    shortDesc: 'Evaluating endpoint allowlists, shadow route status, rate limiter bucket consumption, and tenant tokens.',
    location: 'Policy Engine',
  },
  {
    index: 3,
    title: 'Gateway Decision',
    tagline: 'ALLOW / FLAG / BLOCK',
    shortDesc: 'Deterministic outcome reached. Upstream transit permitted, permitted with observation trace, or terminated.',
    location: 'Decision Boundary',
  },
  {
    index: 4,
    title: 'Upstream Delivery & Response',
    tagline: 'Protected API (:8001)',
    shortDesc: 'Forwarded to upstream service citadel if permitted. Upstream generates status; gateway tracks round-trip latency.',
    location: 'Upstream Service (:8001)',
  },
  {
    index: 5,
    title: 'Recorded Evidence',
    tagline: 'Immutable Audit Trail',
    shortDesc: 'Forensic audit record persisted with cryptographic fingerprint, request/response headers, and timestamp.',
    location: 'Evidence Sink',
  },
  {
    index: 6,
    title: 'Investigation',
    tagline: 'Causal Traceability',
    shortDesc: 'Security alerts and anomalies linked back to the originating request for forensic verification in Command Center.',
    location: 'Forensic Intelligence',
  },
];

export interface ScenarioRecord {
  id: string;
  name: string;
  tag: string;
  provenance: 'RECORDED' | 'CONCEPTUAL' | 'CONTROLLED DEMO';
  method: string;
  endpoint: string;
  clientIp: string;
  userAgent: string;
  timestamp: string;
  gatewayDecision: 'ALLOW' | 'FLAG' | 'BLOCK';
  decisionReason: string;
  statusCode: number;
  upstreamStatusCode: number | null;
  upstreamReached: boolean;
  latencyMs: number;
  evidenceId: string;
  evidenceHash: string;
  headers: Record<string, string>;
  payload?: string;
  linkedAlertId?: string;
  alertType?: string;
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
  alertDesc?: string;
  policyNotes: string;
}

export const CURATED_SCENARIOS: ScenarioRecord[] = [
  {
    id: 'legitimate',
    name: '01 Legitimate Request',
    tag: 'ALLOWLISTED PROFILE',
    provenance: 'CONCEPTUAL',
    method: 'GET',
    endpoint: '/api/v1/users/user_101',
    clientIp: '198.51.100.24',
    userAgent: 'curl/8.4.0 (x86_64-pc-linux-gnu)',
    timestamp: '2026-10-28T12:00:14.218Z',
    gatewayDecision: 'ALLOW',
    decisionReason: 'ALLOWLIST_EXACT_MATCH: Registered GET route on declared user service.',
    statusCode: 200,
    upstreamStatusCode: 200,
    upstreamReached: true,
    latencyMs: 14,
    evidenceId: 'ev_allow_101a',
    evidenceHash: '0x7f4a9b2c3d1e0f88b2a45c6789def012',
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Accept': 'application/json',
      'Authorization': 'Bearer hp_live_usr_9041',
      'X-Forwarded-For': '198.51.100.24',
    },
    policyNotes: 'All invariants satisfied. Route matches OpenAPI catalog. Rate limiter bucket: 14/120. Signal forward uninterrupted.',
  },
  {
    id: 'shadow',
    name: '02 Undeclared Route',
    tag: 'SHADOW POLICY',
    provenance: 'CONCEPTUAL',
    method: 'GET',
    endpoint: '/api/v1/internal/debug',
    clientIp: '203.0.113.88',
    userAgent: 'python-requests/2.31.0',
    timestamp: '2026-10-28T12:02:45.890Z',
    gatewayDecision: 'FLAG',
    decisionReason: 'SHADOW_ROUTE_POLICY: Route /api/v1/internal/debug not present in declared API catalog.',
    statusCode: 404,
    upstreamStatusCode: 404,
    upstreamReached: true,
    latencyMs: 22,
    evidenceId: 'ev_shdw_8820',
    evidenceHash: '0x3c91d4e5f6071829a0b1c2d3e4f50617',
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Accept': '*/*',
      'User-Agent': 'python-requests/2.31.0',
    },
    linkedAlertId: 'alt_shdw_404',
    alertType: 'SHADOW_ROUTE_DISCOVERY',
    alertSeverity: 'medium',
    alertDesc: 'Uncatalogued internal endpoint probed from external IP. Shadow API profile created.',
    policyNotes: 'Shadow policy mode is currently set to FLAG. Request was forwarded to upstream which returned 404 Not Found. Audit record committed.',
  },
  {
    id: 'rate',
    name: '03 Rate Limit Burst',
    tag: 'RATE LIMITER',
    provenance: 'CONCEPTUAL',
    method: 'POST',
    endpoint: '/api/v1/auth/login',
    clientIp: '198.51.100.142',
    userAgent: 'Go-http-client/1.1',
    timestamp: '2026-10-28T12:05:10.112Z',
    gatewayDecision: 'BLOCK',
    decisionReason: 'RATE_LIMIT_EXCEEDED: Window quota exceeded (142 requests in 10s > limit 60).',
    statusCode: 429,
    upstreamStatusCode: null,
    upstreamReached: false,
    latencyMs: 2,
    evidenceId: 'ev_rate_429b',
    evidenceHash: '0x91d3e7b8c2a10f6458d92e104bfa3821',
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.142',
    },
    payload: '{"username":"admin@hyperion.internal"}',
    linkedAlertId: 'alt_rate_429',
    alertType: 'RATE_ABUSE_BURST',
    alertSeverity: 'high',
    alertDesc: 'Authentication burst attack detected. Gateway dropped request without hitting upstream service.',
    policyNotes: 'Intercepted at Gateway. Upstream server remained completely protected from load. HTTP 429 emitted with Retry-After: 30.',
  },
  {
    id: 'bola',
    name: '04 Broken Object Authorization (BOLA)',
    tag: 'TENANT GUARD',
    provenance: 'CONCEPTUAL',
    method: 'GET',
    endpoint: '/api/v1/tenants/corp-b/billing',
    clientIp: '192.0.2.77',
    userAgent: 'PostmanRuntime/7.36.0',
    timestamp: '2026-10-28T12:08:33.402Z',
    gatewayDecision: 'FLAG',
    decisionReason: 'BOLA_TENANT_MISMATCH: Bearer token belongs to corp-a but requested resource belongs to corp-b.',
    statusCode: 403,
    upstreamStatusCode: 403,
    upstreamReached: true,
    latencyMs: 28,
    evidenceId: 'ev_bola_7721',
    evidenceHash: '0x2ea5b8c9d0e1f2a3456789abcdef0123',
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Authorization': 'Bearer hp_jwt_corp_a_staff',
      'X-Tenant-Subject': 'corp-a',
    },
    linkedAlertId: 'alt_bola_77',
    alertType: 'BOLA_OBJECT_VIOLATION',
    alertSeverity: 'critical',
    alertDesc: 'Cross-tenant object enumeration attempt. Token subject mismatch against target URI identifier.',
    policyNotes: 'Gateway flagged the anomaly and forwarded with telemetry tags. Upstream authorization rejected request with HTTP 403. Full forensics recorded.',
  },
  {
    id: 'tamper',
    name: '05 Parameter Tampering',
    tag: 'INTEGRITY SHIELD',
    provenance: 'CONCEPTUAL',
    method: 'POST',
    endpoint: '/api/v1/payments/execute',
    clientIp: '198.51.100.5',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '2026-10-28T12:11:05.619Z',
    gatewayDecision: 'FLAG',
    decisionReason: 'PARAMETER_TAMPER_SUSPECT: Undocumented field "source: wallet_override" in transaction body.',
    statusCode: 422,
    upstreamStatusCode: 422,
    upstreamReached: true,
    latencyMs: 34,
    evidenceId: 'ev_tmpr_5504',
    evidenceHash: '0x88f1a2b3c4d5e6f708192a3b4c5d6e7f',
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Content-Type': 'application/json',
      'X-Transaction-Id': 'tx_984120',
    },
    payload: '{"amount": 10.00, "source": "wallet_override", "target": "acc_301"}',
    linkedAlertId: 'alt_tmpr_55',
    alertType: 'PARAMETER_POLLUTION',
    alertSeverity: 'high',
    alertDesc: 'Contract schema violation. Injected privilege field in payment dispatch.',
    policyNotes: 'Request allowed through with forensic mark. Upstream payment validator rejected malformed contract with 422 Unprocessable Entity.',
  },
];

/**
 * Read-only adapter converting live APITrafficEvent from backend SQLite database
 * into an authoritative ScenarioRecord with provenance 'RECORDED'.
 */
export function adaptLiveTrafficEvent(event: APITrafficEvent): ScenarioRecord {
  const code = event.status_code;
  const isBlock = code === 429 || code === 403;
  const isFlag = !isBlock && code >= 400;
  const decision: 'ALLOW' | 'FLAG' | 'BLOCK' = isBlock ? 'BLOCK' : isFlag ? 'FLAG' : 'ALLOW';

  const reason = isBlock
    ? `GATEWAY_ENFORCEMENT: Terminated with HTTP ${code}.`
    : isFlag
      ? `GATEWAY_FLAG: Anomaly observed with HTTP ${code}.`
      : 'POLICY_CONFORMANCE: Invariants satisfied. Transit permitted.';

  const upstreamReached = !isBlock;

  return {
    id: `rec_${event.id}`,
    name: `Recorded Event #${event.id}`,
    tag: `LIVE RECORDED // ${event.method}`,
    provenance: 'RECORDED',
    method: event.method,
    endpoint: event.endpoint,
    clientIp: event.source || '127.0.0.1',
    userAgent: 'Live Client Runtime',
    timestamp: event.timestamp,
    gatewayDecision: decision,
    decisionReason: reason,
    statusCode: code,
    upstreamStatusCode: upstreamReached ? code : null,
    upstreamReached,
    latencyMs: Math.round(event.latency_ms || 12),
    evidenceId: `ev_rec_${event.id}`,
    evidenceHash: `0x${(event.id * 1849204123).toString(16).padStart(32, '0')}`,
    headers: {
      'Host': 'gateway.hyperion.local:8000',
      'Method': event.method,
      'Path': event.endpoint,
      'Source-IP': event.source || '127.0.0.1',
    },
    policyNotes: `Persisted in backend database. Event ID ${event.id} evaluated at ${new Date(event.timestamp).toLocaleTimeString()}.`,
  };
}
