// frontend/src/api.ts
import { APITrafficEvent, SecurityAlert, RiskScore, HealthResponse, APITrafficLog, GovernanceKPIs, InventoryEndpoint, RiskHierarchyResponse, ExecutionFlowResponse } from './types'

export const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000'

export const api = {
  health: async (signal?: AbortSignal): Promise<HealthResponse> => {
    const res = await fetch(`${API_BASE}/api/health`, { signal })
    if (!res.ok) throw new Error('Failed to fetch health')
    return res.json()
  },
  // Traffic events
  getTrafficEvents: async (skip: number = 0, limit: number = 100, signal?: AbortSignal): Promise<APITrafficEvent[]> => {
    const res = await fetch(`${API_BASE}/api/traffic?skip=${skip}&limit=${limit}`, { signal })
    if (!res.ok) throw new Error('Failed to fetch traffic events')
    return res.json()
  },
  getTrafficLogById: async (id: number, signal?: AbortSignal): Promise<APITrafficLog> => {
    const res = await fetch(`${API_BASE}/api/traffic/${id}`, { signal })
    if (!res.ok) throw new Error('Failed to fetch traffic log by ID')
    return res.json()
  },
  // Security alerts
  getSecurityAlerts: async (skip: number = 0, limit: number = 100, signal?: AbortSignal): Promise<SecurityAlert[]> => {
    const res = await fetch(`${API_BASE}/api/alerts?skip=${skip}&limit=${limit}`, { signal })
    if (!res.ok) throw new Error('Failed to fetch security alerts')
    return res.json()
  },
  // Risk scores
  getRiskScores: async (skip: number = 0, limit: number = 100, signal?: AbortSignal): Promise<RiskScore[]> => {
    const res = await fetch(`${API_BASE}/api/risk-scores?skip=${skip}&limit=${limit}`, { signal })
    if (!res.ok) throw new Error('Failed to fetch risk scores')
    return res.json()
  },
  getInventory: async (signal?: AbortSignal): Promise<InventoryEndpoint[]> => {
    const res = await fetch(`${API_BASE}/api/governance/inventory`, { signal })
    if (!res.ok) throw new Error('Failed to fetch API inventory')
    return res.json()
  },
  getKPIs: async (signal?: AbortSignal): Promise<GovernanceKPIs> => {
    const res = await fetch(`${API_BASE}/api/governance/kpis`, { signal })
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics')
    return res.json()
  },
  getRiskHierarchy: async (signal?: AbortSignal): Promise<RiskHierarchyResponse> => {
    const res = await fetch(`${API_BASE}/api/risk-hierarchy`, { signal })
    if (!res.ok) throw new Error('Failed to fetch risk hierarchy')
    return res.json()
  },
  getExecutionFlow: async (options?: { alertId?: string; eventId?: number }, signal?: AbortSignal): Promise<ExecutionFlowResponse> => {
    const params = new URLSearchParams()
    if (options?.alertId) params.set('alert_id', options.alertId)
    if (options?.eventId) params.set('event_id', String(options.eventId))
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_BASE}/api/execution-flow${query}`, { signal })
    if (!res.ok) throw new Error('Failed to fetch execution flow')
    return res.json()
  },
  simulate: async (): Promise<{ status: string; output?: string; errors?: string; message?: string }> => {
    const res = await fetch(`${API_BASE}/api/governance/simulate`, { method: 'POST' })
    if (!res.ok) throw new Error('Demo request failed. Check the backend before retrying.')
    return res.json()
  },
}

export default api
