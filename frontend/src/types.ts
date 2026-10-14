export type SecurityAction = 'allow' | 'mask' | 'block' | 'warn'

export interface ChatRequest {
  message: string
  user_id?: string
  session_id?: string
}

export interface ChatResponse {
  response: string
  security_action: SecurityAction
  explanation: string
  incident_id?: string
  timestamp: string
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
}

export interface Incident {
  id: string
  timestamp: string
  user_id?: string
  action_taken: SecurityAction
  explanation: string
  data_types_detected: string[]
}

export interface IncidentsResponse {
  incidents: Incident[]
  total: number
  limit: number
  offset: number
}

export interface ErrorResponse {
  error: string
  error_code: string
  timestamp: string
}
