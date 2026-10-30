import { DecisionMode } from './scene/CinematicWatchWorld';

export interface NetworkScenario {
  id: string;
  name: string;
  shortLabel: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  clientIp: string;
  clientGeo: string;
  statusCode: number;
  statusText: string;
  decision: DecisionMode;
  latencyMs: number;
  policyRule: string;
  evidenceHash: string;
  description: string;
  invariants: string[];
}

export const NETWORK_SCENARIOS: NetworkScenario[] = [
  {
    id: 'legitimate-read',
    name: 'Legitimate Request (ALLOW)',
    shortLabel: '01 ALLOW',
    method: 'GET',
    path: '/api/v1/users/202/profile',
    clientIp: '198.51.100.42',
    clientGeo: 'US (San Francisco)',
    statusCode: 200,
    statusText: '200 OK',
    decision: 'ALLOW',
    latencyMs: 14.8,
    policyRule: 'RULE-AUTH-VERIFIED: Valid RS256 Bearer token, session bound to tenant_202',
    evidenceHash: 'sha256:7b94c251e06fa83461298516da89b2512803b8782a138b812f84a719d3809dfa',
    description: 'Request successfully verified against API security policies. Emits forward conduit to Protected Upstream Citadel with cryptographic trace.',
    invariants: [
      'JWT signature matches public key',
      'Resource ownership verified (User 202)',
      'Rate limit consumption within quota',
    ],
  },
  {
    id: 'bola-attack',
    name: 'BOLA Attack Vector (FLAG)',
    shortLabel: '02 FLAG',
    method: 'GET',
    path: '/api/v1/accounts/84920/transactions',
    clientIp: '203.0.113.88',
    clientGeo: 'DE (Frankfurt)',
    statusCode: 403,
    statusText: '403 FORBIDDEN',
    decision: 'FLAG',
    latencyMs: 22.4,
    policyRule: 'RULE-BOLA-OBJECT-MISMATCH: Subject "usr_104" attempted cross-tenant object traversal',
    evidenceHash: 'sha256:3a8d11c08be33a046c820cfb2e67503fa374e2d354b51908bfba2487e2213e91',
    description: 'Broken Object-Level Authorization detected. Request isolated, flagged with high-severity amber telemetry, and copied to Forensic Cryptographic Vault.',
    invariants: [
      'Caller identity token valid',
      'Target resource "tenant_84920" unowned by caller',
      'Violation logged to forensic evidence ledger',
    ],
  },
  {
    id: 'rate-limit-spike',
    name: 'Rate Limit Surge (BLOCK)',
    shortLabel: '03 BLOCK',
    method: 'POST',
    path: '/api/v1/auth/token',
    clientIp: '192.0.2.147',
    clientGeo: 'RO (Bucharest)',
    statusCode: 429,
    statusText: '429 TOO MANY REQUESTS',
    decision: 'BLOCK',
    latencyMs: 4.1,
    policyRule: 'RULE-TOKEN-BUCKET-EXCEEDED: Token bucket 0 remaining, ingress rate 420 req/s > limit 50 req/s',
    evidenceHash: 'sha256:e1a90c4d29f45b5302f23b2046ca9f64bf459392e01fb3313d31cae98ff99831',
    description: 'Volumetric authentication spike blocked at outer armor gateway ring. Request dropped immediately; zero traffic reaches Protected Upstream Citadel.',
    invariants: [
      'Sliding window rate limit exceeded',
      'Connection terminated at gateway boundary',
      'IP reputation score downgraded',
    ],
  },
];
