import { ChatRequest, ChatResponse, HealthResponse, IncidentsResponse, Incident } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export const api = {
  health: async (): Promise<HealthResponse> => {
    const res = await fetch(`${API_BASE}/api/health`)
    if (!res.ok) throw new Error('Failed to fetch health')
    return res.json()
  },
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to process chat')
    }
    return res.json()
  },
  getIncidents: async (limit: number = 50, offset: number = 0): Promise<IncidentsResponse> => {
    const res = await fetch(`${API_BASE}/api/incidents?limit=${limit}&offset=${offset}`)
    if (!res.ok) throw new Error('Failed to fetch incidents')
    return res.json()
  },
}

export default api
