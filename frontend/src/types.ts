// frontend/src/types.ts
export interface APITrafficEvent {
  id: number
  timestamp: string
  method: string
  endpoint: string
  caller_ip: string | null
  user_id: string | null
  target_resource_id: string | null
  token: string | null
  auth_type: string | null
  payload_size_bytes: number
  status_code: number
}

export interface APITrafficLog extends APITrafficEvent {}

export interface SecurityAlert {
  alert_id: string
  alert_type: string
  severity: string
  description: string
  detection_method: string
  timestamp: string
  related_event_ids: number[]
  recommended_action: string
}

export interface RiskScore {
  score_id: string
  target_type: string
  target_id: string
  score: number
  risk_level: string
  factors: string[]
  alert_id: string | null
  timestamp: string
}

export interface GovernanceKPIs {
  total_apis: number
  total_requests_observed: number
  active_alerts: number
  high_risk_endpoints: number
  shadow_apis: number
  avg_risk_score: number
}

export interface HealthResponse {
  status: string
  timestamp: string
  version: string
  hyperion_security_engine?: string
}

export interface InventoryEndpoint {
  id: number
  method: string
  endpoint: string
  is_shadow: boolean
  risk_score: number
  severity: string
  risk_reasons: string[]
  alert_count: number
  auth_type: string
  contains_pii: boolean
  total_calls: number
  last_seen: string | null
}
