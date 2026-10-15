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

export interface HierarchyEndpointAlert {
  alert_id: string
  alert_type: string
  severity: string
  description: string
  timestamp: string
  related_event_id: number | null
}

export interface HierarchyEvidenceEvent {
  id: number
  method: string
  endpoint: string
  caller_ip: string | null
  user_id: string | null
  target_resource_id: string | null
  status_code: number
  timestamp: string
}

export interface HierarchyEndpoint {
  id: number
  method: string
  endpoint: string
  risk_score: number
  severity: string
  is_shadow: boolean
  auth_type: string
  contains_pii: boolean
  total_calls: number
  last_seen: string | null
  risk_reasons: string[]
  alerts: HierarchyEndpointAlert[]
  evidence_events: HierarchyEvidenceEvent[]
}

export interface ServiceDomainRisk {
  id: string
  name: string
  description: string
  risk_score: number
  severity: string
  avg_risk_score: number
  max_risk_score: number
  endpoint_count: number
  shadow_count: number
  alert_count: number
  drivers: string[]
  endpoints: HierarchyEndpoint[]
}

export interface PlatformRisk {
  name: string
  organization: string
  risk_score: number
  severity: string
  total_services: number
  total_endpoints: number
  total_shadow_endpoints: number
  active_alerts_count: number
  factors: string[]
  evaluated_at: string
}

export interface RiskHierarchyResponse {
  platform: PlatformRisk
  services: ServiceDomainRisk[]
}

export interface ExecutionFlowStage {
  step: number
  id: string
  name: string
  status: string
  summary: string
  meta: Record<string, string | number | boolean | null | undefined>
}

export interface ExecutionFlowEventOption {
  type: 'alert' | 'traffic'
  id: string
  event_id: number | null
  label: string
  alert_type: string
  severity: string
  timestamp: string
}

export interface ExecutionFlowResponse {
  has_data: boolean
  message?: string
  selected_alert_id: string | null
  selected_event_id: number | null
  available_events: ExecutionFlowEventOption[]
  stages: ExecutionFlowStage[]
}
