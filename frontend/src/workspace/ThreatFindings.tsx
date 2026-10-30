import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { APITrafficLog, SecurityAlert } from '../types'
import type { SecuritySnapshot } from '../hooks/useSecurityData'
import api from '../api'
import { Link } from '../router'
import { detectionName, selectFindings, type FindingFilters } from './findings'

const categories = [['all', 'All signals'], ['bola', 'Object access'], ['token_replay', 'Token misuse'], ['scraping', 'Scraping']]
const defaults: FindingFilters = { search: '', severity: 'all', category: 'all', arrival: 'all' }
function readView(): { filters: FindingFilters; openedAt: number; selected: string | null } {
  try {
    const saved = JSON.parse(sessionStorage.getItem('hyperion-findings-view') || 'null')
    if (saved && typeof saved.openedAt === 'number' && saved.filters && Object.keys(defaults).every(key => typeof saved.filters[key] === 'string')) return { filters: { ...defaults, ...saved.filters }, openedAt: saved.openedAt, selected: typeof saved.selected === 'string' ? saved.selected : null }
  } catch { /* Storage is optional; the inbox remains functional without it. */ }
  return { filters: defaults, openedAt: Date.now(), selected: null }
}
function Finding({ alert, data, open, onSelect, index, openedAt }: { alert: SecurityAlert; data: SecuritySnapshot; open: boolean; onSelect: () => void; index: number; openedAt: number }) {
  const loaded = data.traffic.find(row => alert.related_event_ids.includes(row.id))
  const [evidence, setEvidence] = useState<APITrafficLog | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const eventId = alert.related_event_ids[0]
  useEffect(() => {
    if (!open || loaded || !eventId || evidence?.id === eventId) return
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getTrafficLogById(eventId, controller.signal).then(setEvidence).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Evidence unavailable')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open, loaded?.id, eventId])
  const event = loaded || evidence
  const fresh = Date.parse(alert.timestamp) > openedAt
  const detailId = `finding-detail-${alert.alert_id}`
  return <article className={`finding-row ${open ? 'is-open' : ''}`} style={{ '--reveal-delay': `${Math.min(index, 6) * 22}ms` } as CSSProperties}>
    <button className="finding-select" aria-expanded={open} aria-controls={detailId} onClick={onSelect}>
      <span className={`finding-severity severity-${alert.severity.toLowerCase()}`}><i/>{alert.severity}</span>
      <span className="finding-content"><span className="finding-category">{detectionName(alert.alert_type)} <small>/{alert.alert_id}</small></span><span className="finding-endpoint">{event ? `${event.method} ${event.endpoint}` : eventId ? 'Endpoint in linked evidence' : 'Endpoint not recorded'}</span><span className="finding-explanation">{alert.description}</span></span>
      <span className="finding-time"><time dateTime={alert.timestamp}>{new Date(alert.timestamp).toLocaleDateString([], { month:'short', day:'numeric' })}<span>{new Date(alert.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span></time><small className={fresh ? 'is-new' : ''}>{fresh ? 'New since opened' : 'Historical'}</small></span>
      <span className="finding-evidence">{eventId ? 'Evidence linked' : 'Unlinked record'}<span className="finding-expand" aria-hidden="true">{open ? '−' : '+'}</span></span>
    </button>
    <div id={detailId} className={`finding-reveal ${open ? 'is-expanded' : ''}`} aria-hidden={!open}><div className="finding-reveal-clip"><div className="finding-reveal-inner">
      <div><span className="editorial-label">DETECTION CONTEXT</span><p>{alert.description}</p><span className="finding-detector">{alert.detection_method}</span><p className="finding-action">{alert.recommended_action}</p></div>
      <div className="finding-evidence-detail"><span className="editorial-label">PERSISTED EVIDENCE</span>{loading && <p role="status">Resolving request #{eventId}…</p>}{error && <p role="alert">{error}</p>}{event && <><p className="evidence-request">{event.method} {event.endpoint}</p><dl><div><dt>Request</dt><dd>#{event.id}</dd></div><div><dt>Response</dt><dd>{event.status_code}</dd></div><div><dt>Caller</dt><dd>{event.caller_ip || 'Not supplied'}</dd></div></dl></>}{!eventId && <p>This historical finding has no linked request. No evidence has been inferred.</p>}<Link tabIndex={open ? 0 : -1} className="editorial-link" href={`/command-center/investigation?alert=${encodeURIComponent(alert.alert_id)}`}>Open Investigation <span aria-hidden="true">↗</span></Link></div>
    </div></div></div>
  </article>
}
export default function ThreatFindings({ data }: { data: SecuritySnapshot }) {
  const [initial] = useState(readView)
  const [filters, setFilters] = useState(initial.filters)
  const [selected, setSelected] = useState<string | null>(initial.selected)
  const [category, setCategory] = useState(initial.filters.category)
  const [phase, setPhase] = useState('settled')
  const previousCategory = useRef(initial.filters.category)
  useEffect(() => {
    try { sessionStorage.setItem('hyperion-findings-view', JSON.stringify({ filters, selected, openedAt: initial.openedAt })) } catch { /* optional */ }
  }, [filters, selected, initial.openedAt])
  useEffect(() => {
    if (previousCategory.current === filters.category) return
    previousCategory.current = filters.category
    setPhase('leaving')
    const timer = window.setTimeout(() => { setCategory(filters.category); setPhase('entering') }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 130)
    return () => window.clearTimeout(timer)
  }, [filters.category])
  const change = (key: keyof FindingFilters, value: string) => setFilters(current => ({ ...current, [key]: value }))
  const rows = selectFindings(data.alerts, data.traffic, { ...filters, category }, initial.openedAt)
  const activeIndex = Math.max(0, categories.findIndex(([key]) => key === filters.category))
  return <section className="findings-editorial" aria-label="Threat findings inbox">
    <div className="finding-categories" role="group" aria-label="Detector categories" style={{ '--category-index': activeIndex } as CSSProperties}>
      {categories.map(([key, label]) => <button key={key} aria-pressed={filters.category === key} onClick={() => change('category', key)}>{label}<small>{key === 'all' ? data.alerts.length : data.alerts.filter(alert => alert.alert_type === key).length}</small></button>)}<span className="category-indicator" aria-hidden="true"/>
    </div>
    <div className="editorial-filters"><label className="editorial-search"><span aria-hidden="true">⌕</span><input aria-label="Search findings" placeholder="Search signal, endpoint or finding…" value={filters.search} onChange={event => change('search', event.target.value)}/></label><label className="editorial-filter"><span>Severity</span><select aria-label="Finding severity" value={filters.severity} onChange={event => change('severity', event.target.value)}><option value="all">All severities</option>{['critical','high','medium','low'].map(value => <option key={value}>{value}</option>)}</select></label><label className="editorial-filter"><span>Arrival</span><select aria-label="Finding arrival" value={filters.arrival} onChange={event => change('arrival', event.target.value)}><option value="all">All arrivals</option><option value="new">New since opened</option></select></label><button className="editorial-reset" onClick={() => setFilters(defaults)}>Clear filters</button></div>
    <div className="findings-caption"><span role="status">{rows.length} {rows.length === 1 ? 'finding' : 'findings'}</span><span>Newest 100 records · refresh every 5s</span></div>
    <div className={`finding-stream phase-${phase}`} key={category}>{rows.length ? rows.map((alert, index) => <Finding key={alert.alert_id} alert={alert} data={data} open={selected === alert.alert_id} onSelect={() => setSelected(current => current === alert.alert_id ? null : alert.alert_id)} index={index} openedAt={initial.openedAt}/>) : <div className="findings-empty"><span className="editorial-label">NO MATCHING SIGNALS</span><h2>A quiet view.</h2><p>{data.alerts.length ? 'No findings match these filters. Broaden your selection or clear filters.' : 'No findings have been recorded. Observed security detections will appear here.'}</p><button className="editorial-link" onClick={() => setFilters(defaults)}>Clear filters ↗</button></div>}</div>
    <p className="findings-footnote">“New” means detected since this inbox session began. Arrival is not a read/unread status. Linked evidence is persisted traffic, never a reconstructed request.</p>
  </section>
}
