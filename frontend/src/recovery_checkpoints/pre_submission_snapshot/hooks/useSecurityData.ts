import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import { emptySignalState, reconcileSignals } from '../workspace/liveSignal'
import { APITrafficEvent, GovernanceKPIs, HealthResponse, InventoryEndpoint, RiskHierarchyResponse, RiskScore, SecurityAlert } from '../types'

export interface SecuritySnapshot {
  health: HealthResponse
  kpis: GovernanceKPIs
  inventory: InventoryEndpoint[]
  traffic: APITrafficEvent[]
  alerts: SecurityAlert[]
  risk: RiskScore[]
  hierarchy: RiskHierarchyResponse
}

// One subscription for the entire workspace, not one per tab. No overlapping
// batches; abort on unmount, suspend when hidden, retain last successful data.
export function useSecurityData() {
  const [data, setData] = useState<SecuritySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [signals, setSignals] = useState(emptySignalState)
  const signalRef = useRef(emptySignalState())
  const refreshRef = useRef<() => void>(() => {})
  const refresh = useCallback(() => refreshRef.current(), [])
  useEffect(() => {
    let disposed = false
    let busy = false
    let timer = 0
    let timeout = 0
    let controller: AbortController | undefined
    const poll = async () => {
      if (disposed || busy || document.hidden) return
      busy = true; setRefreshing(true)
      window.clearTimeout(timer)
      controller = new AbortController()
      timeout = window.setTimeout(() => controller?.abort(), 12000)
      try {
        const signal = controller.signal
        const [health, kpis, inventory, traffic, alerts, risk, hierarchy] = await Promise.all([
          api.health(signal), api.getKPIs(signal), api.getInventory(signal),
          api.getTrafficEvents(0, 32, signal), api.getSecurityAlerts(0, 100, signal), api.getRiskScores(0, 1000, signal),
          api.getRiskHierarchy(signal),
        ])
        if (!disposed) {
          const snapshot = { health, kpis, inventory, traffic, alerts, risk, hierarchy }
          const next = reconcileSignals(signalRef.current, snapshot)
          if (next.revision !== signalRef.current.revision) window.dispatchEvent(new CustomEvent('hyperion-observation', {detail:{revision:next.revision,signals:next.batch}}))
          signalRef.current = next; setSignals(next)
          setData(snapshot); setError(null); setUpdated(new Date())
        }
      } catch (reason) {
        // Promise.all fails fast: cancel sibling requests before scheduling a new batch.
        controller.abort()
        if (!disposed) {
          signalRef.current = {...signalRef.current,suspended:true,batch:[]}
          setSignals(signalRef.current)
          window.dispatchEvent(new CustomEvent('hyperion-observation', {detail:{disconnected:true,signals:[]}}))
          setError(reason instanceof Error && reason.name !== 'AbortError' ? reason.message : 'Backend request timed out. Check the local service.')
        }
      } finally {
        window.clearTimeout(timeout); busy = false
        if (!disposed) { setRefreshing(false); timer = window.setTimeout(poll, 5000) }
      }
    }
    const visibility = () => { window.clearTimeout(timer); if (!document.hidden) void poll() }
    refreshRef.current = () => { void poll() }
    document.addEventListener('visibilitychange', visibility)
    void poll()
    return () => {
      disposed = true; window.clearTimeout(timer); window.clearTimeout(timeout); controller?.abort()
      document.removeEventListener('visibilitychange', visibility)
      refreshRef.current = () => {}
      window.dispatchEvent(new CustomEvent('hyperion-observation', {detail:{disconnected:true,signals:[]}}))
    }
  }, [])
  return { data, error, updated, refreshing, refresh, signals }
}
