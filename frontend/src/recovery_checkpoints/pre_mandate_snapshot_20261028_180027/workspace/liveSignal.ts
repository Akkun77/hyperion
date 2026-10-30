import type { SecuritySnapshot } from '../hooks/useSecurityData'

export type SignalKind = 'traffic' | 'finding' | 'shadow' | 'risk'
export interface ObservedSignal {
  key: string; kind: SignalKind; label: string; detail: string; href: string
  timestamp: string; severity?: string; historical?: boolean
}
export interface SignalState {
  ready: boolean; suspended: boolean; since: number; trafficMax: number; alertMax: number
  total: number; endpoints: string[]; scores: Record<string, number>; recent: ObservedSignal[]
  revision: number; batch: ObservedSignal[]; note: string
}
export const emptySignalState = (): SignalState => ({ ready:false, suspended:false, since:0, trafficMax:0, alertMax:0, total:0, endpoints:[], scores:{}, recent:[], revision:0, batch:[], note:'Establishing a baseline. Historical records do not trigger pulses.' })
// FastAPI serializes legacy UTC datetimes without an offset. Do not interpret them as local time.
export const observedTime = (value: string) => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`)
const endpointKey = (row: { method:string; endpoint:string }) => `${row.method} ${row.endpoint}`
const eventSignal = (row: SecuritySnapshot['traffic'][number]): ObservedSignal => ({ key:`traffic:${row.id}`,kind:'traffic',label:`${row.method} ${row.endpoint}`,detail:`Request #${row.id} · HTTP ${row.status_code}`,href:`/command-center/investigation?event=${row.id}`,timestamp:row.timestamp })
const alertSignal = (row: SecuritySnapshot['alerts'][number]): ObservedSignal => ({key:`finding:${row.alert_id}`,kind:'finding',label:row.alert_type.replace(/_/g,' '),detail:`Finding #${row.alert_id} · ${row.severity}`,severity:row.severity,href:`/command-center/investigation?alert=${encodeURIComponent(row.alert_id)}`,timestamp:row.timestamp})

// Bounded snapshot reconciliation, not a fabricated event stream. Numeric SQLite high-water
// marks suppress duplicates even when a record leaves/re-enters the loaded window.
export function reconcileSignals(previous: SignalState, data: SecuritySnapshot, now = Date.now()): SignalState {
  const trafficMax = Math.max(0,...data.traffic.map(row=>row.id))
  const alertMax = Math.max(0,...data.alerts.map(row=>Number(row.alert_id)||0))
  const endpoints = data.inventory.map(endpointKey)
  const scores = Object.fromEntries(data.risk.map(row=>[row.target_id,row.score]))
  const baseline = !previous.ready || previous.suspended || data.kpis.total_requests_observed < previous.total || trafficMax < previous.trafficMax
  if (baseline) return { ...previous, ready:true,suspended:false,since:now,trafficMax,alertMax,total:data.kpis.total_requests_observed,endpoints,scores,batch:[],
    recent: previous.ready ? previous.recent : [...data.alerts.slice(0,2).map(alertSignal),...data.traffic.slice(0,4).map(eventSignal)].map(row=>({...row,historical:true})),
    note: previous.ready ? 'Connection restored / baseline renewed. Catch-up records do not animate.' : 'Baseline loaded. Waiting for newly observed activity.' }
  const fresh = (stamp: string) => Number.isFinite(observedTime(stamp)) && observedTime(stamp) >= Math.max(previous.since,now-30000) && observedTime(stamp) <= now + 5000
  const traffic = data.traffic.filter(row=>row.id>previous.trafficMax && fresh(row.timestamp)).map(eventSignal)
  const alerts = data.alerts.filter(row=>Number(row.alert_id)>previous.alertMax && fresh(row.timestamp)).map(alertSignal)
  const shadows: ObservedSignal[] = data.inventory.filter(row=>row.is_shadow && !previous.endpoints.includes(endpointKey(row)) && row.last_seen && fresh(row.last_seen)).map(row=>({key:`shadow:${row.id}`,kind:'shadow',label:endpointKey(row),detail:`Discovered endpoint #${row.id} · undocumented`,href:`/command-center/investigation?endpoint=${row.id}`,timestamp:row.last_seen!}))
  const risks: ObservedSignal[] = data.risk.filter(row=>previous.scores[row.target_id] !== undefined && previous.scores[row.target_id] !== row.score).map(row=>({key:`risk:${row.target_id}:${previous.revision+1}`,kind:'risk',label:row.target_id,detail:`Risk ${previous.scores[row.target_id]} → ${row.score} / 100`,href:'/command-center/risk',timestamp:new Date(now).toISOString()}))
  const batch = [...alerts,...shadows,...risks,...traffic].slice(0,24)
  const missed = Math.max(0,data.kpis.total_requests_observed-previous.total-traffic.length)
  const note = batch.length ? `${traffic.length} new loaded requests · ${alerts.length} findings · ${shadows.length} shadows · ${risks.length} score changes.${missed ? ` ${missed} additional or historical requests are not animated.` : ''} One bounded pulse per poll batch.` : previous.note
  const keys = new Set(batch.map(row=>row.key))
  return {...previous,trafficMax:Math.max(previous.trafficMax,trafficMax),alertMax:Math.max(previous.alertMax,alertMax),total:data.kpis.total_requests_observed,endpoints,scores,batch,note,
    revision:previous.revision+(batch.length ? 1 : 0),recent:[...batch,...previous.recent.filter(row=>!keys.has(row.key))].slice(0,18)}
}
export function pulseTone(signals: ObservedSignal[]) {
  return signals.some(row=>row.kind==='finding' && ['critical','high'].includes((row.severity||'').toLowerCase())) ? 3 : signals.some(row=>row.kind==='finding'||row.kind==='shadow') ? 2 : 1
}
