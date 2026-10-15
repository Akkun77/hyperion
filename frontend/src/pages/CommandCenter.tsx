import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import Brand from '../components/Brand'
import { Link, navigate } from '../router'
import { filterTraffic, trafficBuckets, findingIsNew } from '../workspace/filters'
import '../workspace/command-center.css'
import { SecuritySnapshot, useSecurityData } from '../hooks/useSecurityData'
import { APITrafficLog, InventoryEndpoint, ExecutionFlowResponse } from '../types'
import api from '../api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)
const tabs = [['', 'Overview', '◈'], ['inventory', 'API inventory', '⊞'], ['traffic', 'Traffic activity', '≋'], ['alerts', 'Threat findings', '⌁'], ['risk', 'Risk intelligence', '◉'], ['flow', 'Execution flow', '☊'], ['investigation', 'Investigation', '⌕']]
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
const inspect = (type: string, id: number | string) => `/command-center/investigation?${type}=${encodeURIComponent(id)}`
function Badge({ value }: { value: string }) { return <span className={`badge badge-${value.toLowerCase()}`}>{value.replace('_', ' ')}</span> }
function Risk({ score }: { score: number }) { return <span className={`risk-inline ${score > 60 ? 'risk-high' : score > 30 ? 'risk-medium' : ''}`}><span className="risk-track"><i style={{ width: `${score}%` }} /></span><b>{score}</b><small>/100</small></span> }
function Empty({ children }: { children: React.ReactNode }) { return <div className="empty-state">{children}</div> }

function Overview({ data }: { data: SecuritySnapshot }) {
  const buckets = useMemo(() => {
    const map = new Map<number, number>()
    data.traffic.forEach(event => { const minute = Math.floor(new Date(event.timestamp).getTime()/60000)*60000; if (Number.isFinite(minute)) map.set(minute, (map.get(minute) || 0)+1) })
    return [...map.entries()].sort((a, b) => a[0]-b[0])
  }, [data.traffic])
  const metrics = [['Observed endpoints', data.kpis.total_apis, 'inventory'], ['Recorded requests', data.kpis.total_requests_observed, 'traffic'], ['Security findings', data.kpis.active_alerts, 'alerts'], ['High-risk endpoints', data.kpis.high_risk_endpoints, 'risk']]
  return <>
    <div className="metric-strip">{metrics.map(([label, value, href]) => <Link href={`/command-center/${href}`} className="metric" key={label}><span>{label}<b>↗</b></span><strong>{Number(value).toLocaleString()}</strong><small>{label === 'High-risk endpoints' ? 'SCORE ABOVE 60 / 100' : 'PERSISTED TELEMETRY'}</small></Link>)}</div>
    <div className="overview-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">OBSERVED ACTIVITY</span><h2>Traffic over time</h2></div><span className="mono muted">{data.traffic.length} most recent requests</span></div>{buckets.length ? <div className="traffic-chart" role="img" aria-label={`Traffic chart showing ${data.traffic.length} recorded requests grouped by minute`}><Line data={{ labels: buckets.map(([stamp]) => new Date(stamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })), datasets: [{ label: 'Recorded requests', data: buckets.map(([, count]) => count), borderColor: '#52e4a3', backgroundColor: 'rgba(82,228,163,.08)', fill: true, tension: .25, pointRadius: buckets.length > 50 ? 0 : 2, borderWidth: 1.5 }] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#87978f', maxTicksLimit: 5, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: '#1e2c25' }, ticks: { color: '#87978f', precision: 0 } } } }} /></div> : <Empty>Traffic will appear when application requests are observed.</Empty>}</section><section className="panel exposure-panel"><span className="eyebrow">EXPOSURE SNAPSHOT</span><h2>Beyond the catalog</h2><div className="exposure-number">{data.kpis.shadow_apis}<span>shadow endpoints</span></div><p>Observed routes absent from the managed OpenAPI specification.</p><Link href="/command-center/inventory?shadow=true" className="text-link">Inspect shadow APIs ↗</Link><div className="panel-foot">AVERAGE RISK <b>{data.kpis.avg_risk_score} / 100</b></div></section></div>
    <section className="panel" style={{ marginTop: '16px' }}><div className="panel-heading"><div><span className="eyebrow">DETECTION ARCHITECTURE</span><h2>API execution &amp; detection pipeline</h2></div><Link className="text-link" href="/command-center/flow">Full execution figure ↗</Link></div><p style={{ fontSize: '11px', color: '#98b5a5', margin: '4px 0 14px' }}>Trace requests from ingress through endpoint resolution, database storage, behavioural engines, alert emission, and risk recalculation.</p><div className="pipeline-figure" style={{ padding: '4px 0' }}>{['Ingress', 'Resolution', 'Storage', 'Detection', 'Alert', 'Risk Update', 'Evidence'].map((name, i) => <div key={name} style={{ display: 'contents' }}><Link href="/command-center/flow" className="pipeline-step" style={{ minWidth: '120px', padding: '10px 12px', textDecoration: 'none' }}><span className="step-number">Stage 0{i+1}</span><span className="step-name" style={{ fontSize: '11px', margin: '4px 0' }}>{name}</span><span className="step-indicator"/></Link>{i < 6 && <span className="pipeline-arrow" aria-hidden="true">→</span>}</div>)}</div></section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">LATEST SIGNALS</span><h2>Recent findings</h2></div><Link className="text-link" href="/command-center/alerts">All findings ↗</Link></div><AlertTable data={data} limit={4}/></section>
  </>
}

function AlertTable({ data, limit = 100, openedAt }: { data: SecuritySnapshot; limit?: number; openedAt?: number }) {
  return data.alerts.length ? <div className="table-scroll"><table role="table" className="alert-table"><thead><tr><th>Finding</th><th>Severity</th><th>Detection context</th><th>Observed / arrival</th><th>Investigation</th></tr></thead><tbody>{data.alerts.slice(0, limit).map(alert => <tr key={alert.alert_id}><td data-label="Finding"><Link className="record-link" href={inspect('alert', alert.alert_id)}>#{alert.alert_id} <span>{alert.alert_type.replace('_', ' ')}</span> ↗</Link></td><td data-label="Severity"><Badge value={alert.severity}/></td><td data-label="Detection context" className="description-cell">{alert.description}</td><td data-label="Observed / arrival" className="mono">{date(alert.timestamp)}{openedAt !== undefined && <small className={`arrival ${findingIsNew(alert.timestamp, openedAt) ? 'arrival-new' : ''}`}>{findingIsNew(alert.timestamp, openedAt) ? 'New since opened' : 'Historical'}</small>}</td><td data-label="Investigation"><Link className="evidence-link" href={inspect('alert', alert.alert_id)}>{alert.related_event_ids.length ? `View evidence #${alert.related_event_ids[0]} ↗` : 'Review unlinked finding ↗'}</Link></td></tr>)}</tbody></table></div> : <Empty>No findings match this view.</Empty>
}

function Inventory({ data }: { data: SecuritySnapshot }) {
  const [search, setSearch] = useState('')
  const [shadow, setShadow] = useState(new URLSearchParams(window.location.search).get('shadow') === 'true')
  const [sort, setSort] = useState('risk')
  useEffect(() => { setShadow(new URLSearchParams(window.location.search).get('shadow') === 'true') }, [window.location.search])
  const [method, setMethod] = useState('all')
  const rows = data.inventory.filter(row => row.endpoint.toLowerCase().includes(search.toLowerCase()) && (!shadow || row.is_shadow) && (method === 'all' || row.method === method)).sort((a, b) => sort === 'risk' ? b.risk_score - a.risk_score : sort === 'activity' ? b.total_calls - a.total_calls : a.endpoint.localeCompare(b.endpoint))
  return <section className="panel"><div className="table-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search endpoints" placeholder="Search endpoints…" value={search} onChange={event => setSearch(event.target.value)}/></label><select aria-label="HTTP method" value={method} onChange={event => setMethod(event.target.value)}><option value="all">All methods</option>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(value => <option key={value}>{value}</option>)}</select><label className="checkbox-label"><input type="checkbox" checked={shadow} onChange={event => setShadow(event.target.checked)}/>Shadow only</label><select aria-label="Sort endpoints" value={sort} onChange={event => setSort(event.target.value)}><option value="risk">Highest risk</option><option value="activity">Most requests</option><option value="path">Endpoint A–Z</option></select><button className="filter-reset" onClick={() => { setSearch(''); setMethod('all'); setShadow(false); setSort('risk') }}>Clear filters</button><span className="result-count mono" role="status">{rows.length} endpoints</span></div><div className="table-scroll"><table role="table" className="inventory-table"><thead><tr><th>Method / endpoint</th><th>Classification</th><th>Risk score</th><th>Auth observed</th><th>Requests</th><th>Last seen</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Method / endpoint"><Link className="endpoint-link" href={inspect('endpoint', row.id)}><span className="method">{row.method}</span><code>{row.endpoint}</code><span>↗</span></Link></td><td data-label="Classification"><Badge value={row.is_shadow ? 'shadow' : 'managed'}/></td><td data-label="Risk score"><Risk score={row.risk_score}/></td><td data-label="Auth observed">{row.auth_type}</td><td data-label="Requests" className="mono">{row.total_calls}</td><td data-label="Last seen" className="mono nowrap">{date(row.last_seen)}</td></tr>)}</tbody></table></div>{!rows.length && <Empty>No endpoints match these filters.</Empty>}<div className="table-note">Inventory reflects persisted observations, including historical demo records. Authentication is an observed signal, not proof of enforced access control.</div></section>
}

function Traffic({ data }: { data: SecuritySnapshot }) {
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [range, setRange] = useState('all')
  const rows = filterTraffic(data.traffic, { search, method, status, range })
  const buckets = trafficBuckets(rows)
  return <section className="panel">
    <div className="table-toolbar">
      <label className="search-field"><span>⌕</span><input aria-label="Search traffic" placeholder="Endpoint, IP, user or event ID…" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <select aria-label="Traffic time range" value={range} onChange={event => setRange(event.target.value)}><option value="all">All loaded history</option><option value="15">Last 15 minutes</option><option value="60">Last hour</option><option value="1440">Last 24 hours</option></select>
      <select aria-label="Traffic method" value={method} onChange={event => setMethod(event.target.value)}><option value="all">All methods</option>{[...new Set(data.traffic.map(row => row.method))].sort().map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Response status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All responses</option><option value="2">2xx success</option><option value="3">3xx redirect</option><option value="4">4xx client error</option><option value="5">5xx server error</option></select>
      <button className="filter-reset" onClick={() => { setSearch(''); setMethod('all'); setStatus('all'); setRange('all') }}>Clear filters</button>
      <span className="result-count mono" role="status">{rows.length} / {data.traffic.length} loaded events</span>
    </div>
    {rows.length > 0 && <div className="traffic-summary"><div className="panel-heading"><h2>Request activity</h2><span className="mono muted">{rows.length} matched · grouped by minute</span></div><div className="traffic-chart" role="img" aria-label={`Filtered traffic chart: ${rows.length} requests in ${buckets.length} observed minutes`}><Line data={{ labels: buckets.map(([stamp]) => new Date(stamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })), datasets: [{ label: 'Observed requests', data: buckets.map(([, count]) => count), borderColor: '#52e4a3', backgroundColor: 'rgba(82,228,163,.08)', fill: true, pointRadius: 2, borderWidth: 1.5 }] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, color: '#9ab5a7' } }, x: { ticks: { color: '#9ab5a7', maxTicksLimit: 5, maxRotation: 0 }, grid: { display: false } } } }}/></div></div>}
    <div className="table-scroll"><table role="table" className="traffic-table"><thead><tr><th>Event</th><th>Request</th><th>Caller IP</th><th>User</th><th>Status</th><th>Observed</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Event"><Link className="record-link" href={inspect('event', row.id)}>#{row.id} ↗</Link></td><td data-label="Request"><span className="method">{row.method}</span> <code>{row.endpoint}</code></td><td data-label="Caller IP" className="mono">{row.caller_ip || 'Unknown'}</td><td data-label="User" className="mono">{row.user_id || 'Not supplied'}</td><td data-label="Status"><Badge value={String(row.status_code)}/></td><td data-label="Observed" className="mono">{date(row.timestamp)}</td></tr>)}</tbody></table></div>
    {!rows.length && <Empty>No traffic matches this view. Change the time range or clear filters.</Empty>}
    <div className="table-note">Filters and chart apply to the 1,000 newest loaded events, not the entire database. Time ranges are relative to now. Click an event ID to inspect its persisted request.</div>
  </section>
}

function Alerts({ data }: { data: SecuritySnapshot }) {
  const [openedAt] = useState(Date.now)
  const [arrival, setArrival] = useState('all')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('all')
  const [type, setType] = useState('all')
  const alerts = data.alerts.filter(row => `${row.description} ${row.alert_type} ${row.alert_id}`.toLowerCase().includes(search.toLowerCase()) && (severity === 'all' || row.severity === severity) && (type === 'all' || row.alert_type === type) && (arrival === 'all' || findingIsNew(row.timestamp, openedAt)))
  return <section className="panel"><div className="table-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search findings" placeholder="Search detection context…" value={search} onChange={event => setSearch(event.target.value)}/></label><select aria-label="Finding severity" value={severity} onChange={event => setSeverity(event.target.value)}><option value="all">All severities</option>{['critical', 'high', 'medium', 'low'].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Finding type" value={type} onChange={event => setType(event.target.value)}><option value="all">All detections</option><option value="bola">BOLA</option><option value="token_replay">Token misuse</option><option value="scraping">Scraping</option></select><select aria-label="Finding arrival" value={arrival} onChange={event => setArrival(event.target.value)}><option value="all">All arrivals</option><option value="new">New since opened</option></select><button className="filter-reset" onClick={() => { setSearch(''); setSeverity('all'); setType('all'); setArrival('all') }}>Clear filters</button><span className="result-count mono" role="status">{alerts.length} findings</span></div><AlertTable data={{ ...data, alerts }} openedAt={openedAt}/><div className="table-note">Showing up to 100 newest findings. “New” means detected since this inbox was opened. Historical findings may predate traffic evidence links.</div></section>
}

function RiskIntelligence({ data }: { data: SecuritySnapshot }) {
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy')
  const hierarchy = data.hierarchy
  const platform = hierarchy?.platform
  const services = hierarchy?.services || []

  return <div className="risk-intelligence-view">
    <div className="view-mode-switch" role="tablist" aria-label="Risk view mode">
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'hierarchy'}
        className={`mode-button ${viewMode === 'hierarchy' ? 'active' : ''}`}
        onClick={() => setViewMode('hierarchy')}
      >
        Hierarchical Topology
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'flat'}
        className={`mode-button ${viewMode === 'flat' ? 'active' : ''}`}
        onClick={() => setViewMode('flat')}
      >
        Endpoint Breakdown
      </button>
    </div>

    {viewMode === 'hierarchy' && platform && (
      <div className="hierarchy-container">
        <section className="platform-posture">
          <div className="posture-header">
            <div>
              <span className="eyebrow">PLATFORM RISK TOPOLOGY</span>
              <h2>Enterprise Platform Posture</h2>
              <p>{platform.name} · {platform.organization}</p>
            </div>
            <div className="posture-score-box">
              <span className="eyebrow">PLATFORM RISK</span>
              <Risk score={platform.risk_score} />
              <Badge value={platform.severity} />
            </div>
          </div>

          <div className="posture-stats">
            <div className="posture-stat">
              <span>Monitored Domains</span>
              <strong>{platform.total_services}</strong>
            </div>
            <div className="posture-stat">
              <span>Observed Endpoints</span>
              <strong>{platform.total_endpoints}</strong>
            </div>
            <div className="posture-stat">
              <span>Active Threat Alerts</span>
              <strong>{platform.active_alerts_count}</strong>
            </div>
            <div className="posture-stat">
              <span>Unmanaged Shadows</span>
              <strong>{platform.total_shadow_endpoints}</strong>
            </div>
          </div>

          {platform.factors && platform.factors.length > 0 && (
            <div className="posture-factors">
              <span className="eyebrow">PRIMARY RISK DRIVERS</span>
              <ul>
                {platform.factors.map(factor => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="domain-list">
          {services.map(svc => (
            <details className="domain-card" key={svc.id} open={svc.alert_count > 0 || svc.risk_score > 50}>
              <summary>
                <div className="domain-info">
                  <span className="eyebrow">{svc.id.toUpperCase()}</span>
                  <h3>{svc.name}</h3>
                  <p>{svc.endpoint_count} observed endpoints · avg risk {svc.avg_risk_score} / 100</p>
                </div>
                <div className="domain-badges">
                  {svc.shadow_count > 0 && <span className="domain-tag tag-shadow">{svc.shadow_count} SHADOW</span>}
                  {svc.alert_count > 0 && <span className="domain-tag tag-alert">{svc.alert_count} THREATS</span>}
                  <Badge value={svc.severity} />
                  <Risk score={svc.risk_score} />
                </div>
              </summary>
              <div className="domain-body">
                {svc.drivers && svc.drivers.length > 0 && (
                  <div className="domain-drivers">
                    {svc.drivers.map(driver => (
                      <span className="driver-pill" key={driver}>{driver}</span>
                    ))}
                  </div>
                )}

                <div className="endpoints-tree">
                  <span className="eyebrow">CONTAINED ENDPOINTS ({svc.endpoints.length})</span>
                  {svc.endpoints.map(ep => (
                    <div className="endpoint-node" key={ep.id}>
                      <div className="node-header">
                        <div className="node-route">
                          <span className="method">{ep.method}</span>
                          <code>{ep.endpoint}</code>
                          {ep.is_shadow && <Badge value="shadow" />}
                        </div>
                        <div className="node-metrics">
                          <Risk score={ep.risk_score} />
                          <Link className="text-link" href={inspect('endpoint', ep.id)}>Inspect ↗</Link>
                        </div>
                      </div>

                      {ep.risk_reasons && ep.risk_reasons.length > 0 && (
                        <ul className="node-reasons">
                          {ep.risk_reasons.map(r => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      )}

                      {ep.alerts && ep.alerts.length > 0 && (
                        <div className="node-alerts-box">
                          <span className="eyebrow" style={{ color: '#ff9e94' }}>ACTIVE THREAT FINDINGS</span>
                          {ep.alerts.map(alt => (
                            <div className="node-alert-item" key={alt.alert_id}>
                              <span><b>#{alt.alert_id}</b> {alt.alert_type.replace('_', ' ')}: {alt.description}</span>
                              <Link className="evidence-link" href={inspect('alert', alt.alert_id)}>View finding ↗</Link>
                            </div>
                          ))}
                        </div>
                      )}

                      {ep.evidence_events && ep.evidence_events.length > 0 && (
                        <div className="node-traffic-box">
                          <span className="eyebrow">RECENT TRAFFIC EVIDENCE:</span>
                          {ep.evidence_events.map(ev => (
                            <Link key={ev.id} className="record-link" href={inspect('event', ev.id)}>
                              #{ev.id} ({ev.caller_ip || 'Internal'} / status {ev.status_code}) ↗
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    )}

    {(viewMode === 'flat' || !platform) && (
      <section className="risk-list">
        {data.risk.length ? data.risk.map(score => (
          <details className="panel risk-detail" key={score.score_id}>
            <summary>
              <div>
                <span className="eyebrow">ENDPOINT EXPOSURE</span>
                <h2 className="mono">{score.target_id}</h2>
              </div>
              <Risk score={score.score} />
              <Badge value={score.risk_level} />
              <span className="expand-icon">+</span>
            </summary>
            <div className="risk-breakdown">
              <h3>Why this score?</h3>
              <ul>{score.factors.map(factor => <li key={factor}>{factor}</li>)}</ul>
              <p>Contributions are bounded to a final score of 0–100.</p>
              <Link className="text-link" href={inspect('endpoint', score.score_id)}>Inspect endpoint ↗</Link>
            </div>
          </details>
        )) : <Empty>Risk scores appear after endpoint discovery.</Empty>}
      </section>
    )}
  </div>
}

function ExecutionFlow({ path }: { data: SecuritySnapshot; path: string }) {
  const query = new URLSearchParams(path.split('?')[1] || '')
  const initialAlertId = query.get('alert') || undefined
  const initialEventId = query.get('event') ? Number(query.get('event')) : undefined

  const [flow, setFlow] = useState<ExecutionFlowResponse | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<string | undefined>(initialAlertId)
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(initialEventId)
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api.getExecutionFlow({ alertId: selectedAlert, eventId: selectedEvent }, controller.signal)
      .then(res => {
        if (active) {
          setFlow(res)
          const triggerIndex = res.stages.findIndex(s => s.status.toLowerCase() === 'flagged' || s.status.toLowerCase() === 'created' || s.status.toLowerCase() === 'anomaly')
          if (triggerIndex >= 0) setSelectedStageIndex(triggerIndex)
          else setSelectedStageIndex(0)
        }
      })
      .catch(err => {
        if (active) setError(err.message || 'Failed to load execution flow.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [selectedAlert, selectedEvent])

  const stages = flow?.stages || []
  const activeStage = stages[selectedStageIndex] || stages[0]

  return (
    <div className="flow-container">
      <div className="execution-figure">
        <div className="figure-topbar">
          <div className="figure-heading">
            <span className="eyebrow">VISUAL LINEAGE &amp; DETECTION PIPELINE</span>
            <h2>API Execution &amp; Security Detection Flow</h2>
            <p>Chronological 7-stage evaluation: from edge request arrival to security engine inference and evidence binding.</p>
          </div>
          <div className="event-selector-wrap">
            <label htmlFor="flow-event-select">Trace Signal</label>
            <select
              id="flow-event-select"
              aria-label="Select event or alert to trace"
              value={selectedAlert ? `alert:${selectedAlert}` : selectedEvent ? `traffic:${selectedEvent}` : ''}
              onChange={e => {
                const val = e.target.value
                if (val.startsWith('alert:')) {
                  setSelectedAlert(val.replace('alert:', ''))
                  setSelectedEvent(undefined)
                } else if (val.startsWith('traffic:')) {
                  setSelectedEvent(Number(val.replace('traffic:', '')))
                  setSelectedAlert(undefined)
                }
              }}
            >
              {flow?.available_events.map(opt => (
                <option key={`${opt.type}:${opt.id}`} value={`${opt.type}:${opt.id}`}>
                  [{opt.type.toUpperCase()}] {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p role="status" className="mono muted">Resolving pipeline execution trace…</p>}
        {error && <p role="alert" className="error-text">{error}</p>}

        {flow && (
          <>
            <div className="pipeline-figure" role="region" aria-label="7-stage API security execution flow">
              {stages.map((stage, idx) => (
                <div key={stage.id || stage.step} style={{ display: 'contents' }}>
                  <button
                    type="button"
                    className={`pipeline-step ${selectedStageIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedStageIndex(idx)}
                    aria-label={`Stage ${idx + 1}: ${stage.name}`}
                  >
                    <div>
                      <span className="step-number">Stage 0{stage.step || idx + 1}</span>
                      <h4 className="step-name">{stage.name}</h4>
                      <p className="step-summary">{stage.summary}</p>
                    </div>
                    <div className="step-foot">
                      <Badge value={stage.status} />
                      <span className="step-indicator" />
                    </div>
                  </button>
                  {idx < stages.length - 1 && <span className="pipeline-arrow" aria-hidden="true">→</span>}
                </div>
              ))}
            </div>

            {activeStage && (
              <section className="stage-inspector" aria-labelledby="stage-inspector-title">
                <div className="inspector-header">
                  <div>
                    <span className="eyebrow">STAGE 0{activeStage.step || selectedStageIndex + 1} DEEP INSPECTION</span>
                    <h3 id="stage-inspector-title">{activeStage.name}</h3>
                  </div>
                  <Badge value={activeStage.status} />
                </div>
                <p style={{ fontSize: '12px', color: '#b9d4c6', marginBottom: '14px' }}>{activeStage.summary}</p>
                {activeStage.meta && (
                  <dl className="inspector-grid">
                    {Object.entries(activeStage.meta).map(([key, val]) => (
                      <div className="inspector-field" key={key}>
                        <dt>{key.replace(/_/g, ' ')}</dt>
                        <dd>{typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? 'None')}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="inspector-actions">
                  {flow.selected_alert_id && (
                    <Link className="button secondary" href={inspect('alert', flow.selected_alert_id)}>
                      Open finding #{flow.selected_alert_id} in Investigation ↗
                    </Link>
                  )}
                  {flow.selected_event_id && (
                    <Link className="button secondary" href={inspect('event', flow.selected_event_id)}>
                      Inspect event #{flow.selected_event_id} ↗
                    </Link>
                  )}
                  <Link className="text-link" href="/command-center/inventory">
                    Browse inventory ↗
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EndpointEvidence({ endpoint }: { endpoint: InventoryEndpoint }) {
  return <><div className="evidence-title"><span className="method">{endpoint.method}</span><h2 className="mono">{endpoint.endpoint}</h2><Badge value={endpoint.is_shadow ? 'shadow' : 'managed'}/></div><div className="evidence-columns"><section className="panel evidence-block"><span className="eyebrow">EXPLAINABLE RISK</span><Risk score={endpoint.risk_score}/><ul className="factor-list">{endpoint.risk_reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></section><section className="panel evidence-block"><span className="eyebrow">ENDPOINT CONTEXT</span><dl><div><dt>Authentication observed</dt><dd>{endpoint.auth_type}</dd></div><div><dt>Sensitive-data indicator</dt><dd>{endpoint.contains_pii ? 'Present' : 'Not detected'}</dd></div><div><dt>Recorded requests</dt><dd>{endpoint.total_calls}</dd></div><div><dt>Associated findings</dt><dd>{endpoint.alert_count}</dd></div><div><dt>Last seen</dt><dd>{date(endpoint.last_seen)}</dd></div></dl></section></div></>
}

function Investigation({ data, path }: { data: SecuritySnapshot; path: string }) {
  const query = new URLSearchParams(path.split('?')[1] || '')
  const alert = data.alerts.find(row => row.alert_id === query.get('alert'))
  const endpoint = data.inventory.find(row => String(row.id) === query.get('endpoint'))
  const eventId = query.get('event') || alert?.related_event_ids[0]
  const [traffic, setTraffic] = useState<APITrafficLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setTraffic(null); setError(null); setLoading(false)
    if (eventId) {
      setLoading(true)
      api.getTrafficLogById(Number(eventId), controller.signal).then(log => { if (active) setTraffic(log) }).catch(reason => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false; controller.abort() }
  }, [eventId])
  if (endpoint) return <><Link className="text-link investigation-back" href="/command-center/inventory">← Back to inventory</Link><EndpointEvidence endpoint={endpoint}/></>
  if (!alert && !eventId) return <section className="panel"><Empty>{query.get('alert') ? 'This finding is outside the 100 newest loaded findings.' : 'Start with a finding, endpoint or traffic event to follow its evidence.'}</Empty><div className="empty-actions"><Link className="button secondary" href="/command-center/alerts">Browse findings ↗</Link><Link className="text-link" href="/command-center/inventory">Browse inventory ↗</Link></div></section>
  return <><Link className="text-link investigation-back" href={alert ? '/command-center/alerts' : '/command-center/traffic'}>← Back to {alert ? 'findings' : 'traffic'}</Link><div className="investigation-grid">{alert && <section className="panel evidence-block"><div className="panel-heading"><span className="eyebrow">FINDING #{alert.alert_id}</span><Badge value={alert.severity}/></div><h2>{alert.alert_type.replace('_', ' ')}</h2><p>{alert.description}</p><dl><div><dt>Observed</dt><dd>{date(alert.timestamp)}</dd></div><div><dt>Detection</dt><dd>{alert.detection_method}</dd></div></dl><div className="action-note"><span className="eyebrow">RECOMMENDED NEXT STEP</span><p>{alert.recommended_action}</p></div></section>}<section className="panel evidence-block"><span className="eyebrow">PERSISTED TRAFFIC EVIDENCE {eventId ? `#${eventId}` : ''}</span>{loading && <p role="status">Loading related event…</p>}{error && <p role="alert" className="error-text">{error}</p>}{!eventId && <p>This historical finding has no linked traffic record. No evidence has been inferred.</p>}{traffic && <><h2><span className="method">{traffic.method}</span> <code>{traffic.endpoint}</code></h2><dl>{[['Caller IP', traffic.caller_ip], ['User identity', traffic.user_id], ['Target resource', traffic.target_resource_id], ['HTTP status', traffic.status_code], ['Auth signal', traffic.auth_type], ['Payload bytes', traffic.payload_size_bytes], ['Observed', date(traffic.timestamp)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mono">{value ?? 'Not supplied'}</dd></div>)}</dl></>}</section></div></>
}

function DemoControl({ onComplete }: { onComplete: () => void }) {
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const run = async () => {
    setRunning(true); setOutput(''); setError('')
    try {
      const result = await api.simulate()
      setOutput(result.output || '')
      if (result.status !== 'completed' || result.errors) setError(result.errors || result.message || 'The demo did not complete.')
      onComplete()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Demo unavailable') }
    finally { setRunning(false) }
  }
  return <details className="panel demo-control"><summary>Controlled security demo <span>+</span></summary><div><p>Append sample traffic to the local demo APIs: two shadow routes, scraping, token misuse and BOLA. Existing database records are preserved.</p><button className="button secondary" disabled={running} onClick={run}>{running ? 'Running simulation…' : 'Run simulation ↗'}</button><span className="mono" role="status">{running ? 'Waiting for the backend simulation result.' : output ? 'Simulation returned. Read the actual results below.' : ''}</span>{error && <p className="error-text" role="alert">{error}</p>}{output && <pre tabIndex={0} aria-label="Simulation output">{output}</pre>}</div></details>
}

export default function CommandCenter({ path }: { path: string }) {
  const section = path.split('?')[0].replace(/^\/command-center\/?/, '')
  const current = tabs.find(([key]) => key === section)
  const { data, error, updated, refreshing, refresh } = useSecurityData()
  const subtitles: Record<string, string> = {
    '': 'The full picture. From exposure to evidence.',
    inventory: 'Every observed endpoint, including the undocumented.',
    traffic: 'Actual requests, recorded at the API edge.',
    alerts: 'Behavioral signals with an investigation path.',
    risk: 'Exposure scores with every contributing factor.',
    flow: 'Step-by-step visual lineage from edge request to forensic evidence.',
    investigation: 'Follow a finding back to its originating request.'
  }
  return <div className="command-shell"><aside className="command-sidebar"><Link href="/" aria-label="Hyperion home"><Brand /></Link><label className="mobile-navigation">Workspace<select aria-label="Command center page" value={section} onChange={event => navigate(`/command-center${event.target.value ? '/'+event.target.value : ''}`)}>{tabs.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="workspace-label eyebrow">SECURITY WORKSPACE</div><nav aria-label="Workspace navigation">{tabs.map(([key, label, symbol]) => <Link key={key} href={`/command-center${key ? '/'+key : ''}`} className={section === key ? 'active' : ''} aria-current={section === key ? 'page' : undefined}><span>{symbol}</span>{label}<i>↗</i></Link>)}</nav><div className="sidebar-bottom"><span className="mono">HYPERION / v1.0</span><p>Visibility. Behavior. Evidence.</p><Link href="/">← Return to product site</Link></div></aside><div className="command-body"><header className="command-topbar"><span className="eyebrow">HYPERION <b>/</b> COMMAND CENTER</span><span className={`connection ${error ? 'connection-error' : ''}`}><i/>{error ? 'Connection interrupted' : data ? 'Backend connected' : 'Connecting'}</span></header><main id="main" className="command-main"><div className="workspace-heading"><div><div className="eyebrow">OPERATIONAL INTELLIGENCE</div><h1>{current?.[1] || 'Workspace not found'}</h1><p>{subtitles[section]}</p></div><div className="refresh-control"><span className="mono">{updated ? `Synced ${updated.toLocaleTimeString()}` : 'Awaiting telemetry'}<small>REFRESHES EVERY 5 SECONDS</small></span><button className="icon-button" aria-label="Refresh telemetry" disabled={refreshing} onClick={refresh}><span className={refreshing ? 'spin' : ''}>↻</span></button></div></div>{error && <div className="error-banner" role="alert">{error} {data ? 'Showing the last successful snapshot.' : 'Check the configured backend service, then retry.'}<button onClick={refresh}>Retry ↗</button></div>}{section === '' && <DemoControl onComplete={refresh}/>}<span className="sr-only" role="status">{refreshing ? 'Refreshing telemetry' : 'Telemetry refresh complete'}</span>{!data ? <div className="panel empty-state" role="status">{error ? 'Telemetry unavailable.' : 'Reading persisted security telemetry…'}</div> : <div className="route-content" key={section}>{section === '' ? <Overview data={data}/> : section === 'inventory' ? <Inventory data={data}/> : section === 'traffic' ? <Traffic data={data}/> : section === 'alerts' ? <Alerts data={data}/> : section === 'risk' ? <RiskIntelligence data={data}/> : section === 'flow' ? <ExecutionFlow data={data} path={path}/> : section === 'investigation' ? <Investigation data={data} path={path}/> : <Empty><Link href="/command-center">Return to overview ↗</Link></Empty>}</div>}<footer className="workspace-footer"><span>OBSERVE → UNDERSTAND → INVESTIGATE</span><span>PERIODIC REFRESH · 5 SECOND INTERVAL</span></footer></main></div></div>
}
