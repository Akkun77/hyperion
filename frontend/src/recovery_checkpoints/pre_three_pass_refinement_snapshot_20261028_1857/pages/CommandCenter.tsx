import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import Brand from '../components/Brand'
import { Link, navigate } from '../router'
import { findingIsNew } from '../workspace/filters'
import CompactTraffic from '../workspace/CompactTraffic'
import RiskHierarchy from '../workspace/RiskHierarchy'
import ConnectAPI from '../workspace/ConnectAPI'
import SecureGateway from '../workspace/SecureGateway'
import '../workspace/command-center.css'
import ThreatFindings from '../workspace/ThreatFindings'
import LiveSignal from '../workspace/SignalObservatory'
import RouteView from '../workspace/RouteView'
import { useSessionValue } from '../workspace/useSessionValue'
import { SecuritySnapshot, useSecurityData } from '../hooks/useSecurityData'
import { APITrafficLog, InventoryEndpoint, ExecutionFlowResponse, SecurityAlert } from '../types'
import { productRequest } from '../workspace/productApi'
import api from '../api'
import { VeilContextualBackdrop } from '../workspace/VeilContextualBackdrop'
import '../workspace/hyperion-2-workspace.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)
const tabs = [['', 'Overview', '◈'], ['gateway', 'Secure Gateway', '⇄'], ['inventory', 'API inventory', '⊞'], ['traffic', 'Traffic activity', '≋'], ['alerts', 'Threat findings', '⌁'], ['risk', 'Risk intelligence', '◉'], ['flow', 'Execution flow', '☊'], ['investigation', 'Investigation', '⌕']]
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
const inspect = (type: string, id: number | string) => `/command-center/investigation?${type}=${encodeURIComponent(id)}`
function Badge({ value }: { value: string }) { return <span className={`badge badge-${value.toLowerCase()}`}>{value.replace('_', ' ')}</span> }
function Risk({ score }: { score: number }) { return <span className={`risk-inline ${score > 60 ? 'risk-high' : score > 30 ? 'risk-medium' : ''}`}><span className="risk-track"><i style={{ width: `${score}%` }} /></span><b>{score}</b><small>/100</small></span> }
function Empty({ children }: { children: React.ReactNode }) { return <div className="empty-state">{children}</div> }

function Overview({ data }: { data: SecuritySnapshot }) {
  const [selectedService, setSelectedService] = useState<string>('all')
  const buckets = useMemo(() => {
    const map = new Map<number, number>()
    data.traffic.forEach(event => {
      const minute = Math.floor(new Date(event.timestamp).getTime() / 60000) * 60000
      if (Number.isFinite(minute)) map.set(minute, (map.get(minute) || 0) + 1)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [data.traffic])

  // Real-time Gateway decision breakdown
  const gatewayBreakdown = useMemo(() => {
    let allow = 0, flag = 0, block = 0
    data.traffic.forEach(e => {
      const code = e.status_code
      if (code === 429 || code === 403) block++
      else if (code >= 400 || (data.alerts.some(a => a.timestamp.slice(0, 16) === e.timestamp.slice(0, 16)))) flag++
      else allow++
    })
    const total = allow + flag + block || 1
    return {
      allowPct: Math.round((allow / total) * 100),
      flagPct: Math.round((flag / total) * 100),
      blockPct: Math.round((block / total) * 100),
      total: data.traffic.length
    }
  }, [data.traffic, data.alerts])

  const services = data.hierarchy?.services || []
  const activeService = services.find(s => s.id === selectedService)
  const displayedEndpoints = activeService ? activeService.endpoints : data.inventory.slice(0, 10)

  return (
    <div className="observatory-system-grid" aria-label="The Observatory — System Intelligence Region">
      {/* 1. Scope Instrumentation Ribbon */}
      <div className="observatory-scope-ribbon" role="region" aria-label="Observed system scope">
        <Link href="/command-center/inventory" className="scope-metric-cell">
          <span className="scope-cell-label mono">CATALOG ENDPOINTS <b>↗</b></span>
          <strong className="scope-cell-val mono">{Number(data.kpis.total_apis).toLocaleString()}</strong>
          <span className="scope-cell-sub mono">PERSISTED TELEMETRY</span>
        </Link>
        <Link href="/command-center/traffic" className="scope-metric-cell">
          <span className="scope-cell-label mono">RECORDED REQUESTS <b>↗</b></span>
          <strong className="scope-cell-val mono">{Number(data.kpis.total_requests_observed).toLocaleString()}</strong>
          <span className="scope-cell-sub mono">OBSERVED AT INGRESS</span>
        </Link>
        <Link href="/command-center/alerts" className="scope-metric-cell">
          <span className="scope-cell-label mono">SECURITY FINDINGS <b>↗</b></span>
          <strong className="scope-cell-val mono" style={{ color: data.kpis.active_alerts > 0 ? 'var(--flag, #E9B969)' : 'var(--text-primary, #EDEEEB)' }}>
            {Number(data.kpis.active_alerts).toLocaleString()}
          </strong>
          <span className="scope-cell-sub mono">CORRELATED EVIDENCE</span>
        </Link>
        <Link href="/command-center/risk" className="scope-metric-cell">
          <span className="scope-cell-label mono">HIGH-RISK ENDPOINTS <b>↗</b></span>
          <strong className="scope-cell-val mono" style={{ color: data.kpis.high_risk_endpoints > 0 ? 'var(--block, #EB7777)' : 'var(--text-primary, #EDEEEB)' }}>
            {Number(data.kpis.high_risk_endpoints).toLocaleString()}
          </strong>
          <span className="scope-cell-sub mono">SCORE ABOVE 60 / 100</span>
        </Link>
        <Link href="/command-center/inventory?shadow=true" className="scope-metric-cell">
          <span className="scope-cell-label mono">SHADOW ROUTES <b>↗</b></span>
          <strong className="scope-cell-val mono" style={{ color: 'var(--silver, #BFC3C7)' }}>
            {Number(data.kpis.shadow_apis).toLocaleString()}
          </strong>
          <span className="scope-cell-sub mono">BEYOND OPENAPI SPEC</span>
        </Link>
        <Link href="/command-center/risk" className="scope-metric-cell">
          <span className="scope-cell-label mono">SYSTEM POSTURE <b>↗</b></span>
          <strong className="scope-cell-val mono">{data.kpis.avg_risk_score} <small style={{ fontSize: '12px', color: 'var(--text-muted, #7C8593)' }}>/100</small></strong>
          <span className="scope-cell-sub mono">AVERAGE RISK POSTURE</span>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <Link className="text-link mono" href="/command-center/gateway" style={{ fontSize: '13px', color: 'var(--silver, #BFC3C7)', fontWeight: 600 }}>
          Launch Decision Theatre in Secure Gateway ↗
        </Link>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted, #7C8593)' }}>
          SCOPE: {services.length} SERVICE DOMAINS · {data.inventory.length} ENDPOINTS MONITORED
        </span>
      </div>

      {/* 2. Dominant System Atlas: Service Domain Regions & Endpoint Matrix */}
      <section className="observatory-atlas-section" aria-label="Observed System Atlas">
        <div className="atlas-main-panel">
          <div className="atlas-header">
            <div>
              <span className="eyebrow mono">OBSERVED SYSTEM ARCHITECTURE</span>
              <h2>Interactive System Atlas &amp; API Perimeter</h2>
              <p>Explore the active service hierarchy. Select any domain to isolate its endpoint exposure, invariant enforcement, and real-time risk context.</p>
            </div>
            <button
              type="button"
              className={`quality-btn mono ${selectedService === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedService('all')}
            >
              SHOW ALL ({services.length})
            </button>
          </div>

          <div className="atlas-service-deck">
            {services.map(srv => {
              const isSelected = selectedService === srv.id
              const riskClass = srv.risk_score > 60 ? 'chip-high' : srv.risk_score > 30 ? 'chip-med' : 'chip-low'
              return (
                <div
                  key={srv.id}
                  className={`service-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedService(curr => curr === srv.id ? 'all' : srv.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedService(curr => curr === srv.id ? 'all' : srv.id)}
                >
                  <div className="service-card-top">
                    <strong className="service-name">{srv.name}</strong>
                    <span className={`service-risk-chip ${riskClass} mono`}>
                      RISK {srv.risk_score}
                    </span>
                  </div>
                  <div className="service-meta-row mono">
                    <span>{srv.endpoint_count} Endpoints</span>
                    <span>·</span>
                    <span style={{ color: srv.alert_count > 0 ? 'var(--flag, #E9B969)' : 'inherit' }}>
                      {srv.alert_count} Findings
                    </span>
                  </div>
                  {srv.drivers?.length ? (
                    <small className="mono" style={{ fontSize: '10px', color: 'var(--text-muted, #7C8593)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {srv.drivers[0]}
                    </small>
                  ) : <small className="mono" style={{ fontSize: '10px', color: 'var(--text-muted, #7C8593)' }}>Invariants Verified</small>}
                </div>
              )
            })}
          </div>

          {/* Drilldown Endpoint Ledger */}
          <div className="atlas-endpoint-drilldown">
            <div className="drilldown-title mono">
              <span>{activeService ? `SERVICE DOMAIN: ${activeService.name.toUpperCase()}` : 'RECORDED ENDPOINT HORIZON'}</span>
              <span>{displayedEndpoints.length} ENDPOINTS MONITORED</span>
            </div>
            <div className="atlas-endpoints-list">
              {displayedEndpoints.map((ep: any) => (
                <Link
                  key={ep.id}
                  href={inspect('endpoint', ep.id)}
                  className="atlas-endpoint-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="method">{ep.method}</span>
                    <code className="mono">{ep.endpoint}</code>
                    {ep.is_shadow && <Badge value="shadow" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted, #7C8593)' }}>
                      {ep.total_calls} calls
                    </span>
                    <Risk score={ep.risk_score} />
                    <span className="mono" style={{ color: 'var(--silver, #BFC3C7)', fontSize: '11px' }}>Inspect ↗</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Right Rail: Compact Contextual Telemetry Rail */}
        <div className="observatory-rail-panel">
          {/* Gateway Decision Distribution */}
          <div className="rail-box">
            <div className="rail-box-head">
              <span className="eyebrow mono">GATEWAY STATE</span>
              <Link href="/command-center/gateway" className="mono">Theatre ↗</Link>
            </div>
            <h3>Decision Distribution</h3>
            <div className="gateway-dist-bar" style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', margin: '8px 0 12px', background: 'var(--surface-raised, #20252D)' }}>
              <div style={{ width: `${gatewayBreakdown.allowPct}%`, background: 'var(--allow, #53CE9A)' }} title={`ALLOW: ${gatewayBreakdown.allowPct}%`} />
              <div style={{ width: `${gatewayBreakdown.flagPct}%`, background: 'var(--flag, #E9B969)' }} title={`FLAG: ${gatewayBreakdown.flagPct}%`} />
              <div style={{ width: `${gatewayBreakdown.blockPct}%`, background: 'var(--block, #EB7777)' }} title={`BLOCK: ${gatewayBreakdown.blockPct}%`} />
            </div>
            <div className="dist-legend mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary, #A8AFB9)' }}>
              <span style={{ color: 'var(--allow, #53CE9A)' }}>ALLOW {gatewayBreakdown.allowPct}%</span>
              <span style={{ color: 'var(--flag, #E9B969)' }}>FLAG {gatewayBreakdown.flagPct}%</span>
              <span style={{ color: 'var(--block, #EB7777)' }}>BLOCK {gatewayBreakdown.blockPct}%</span>
            </div>
          </div>

          <div className="rail-box">
            <div className="rail-box-head">
              <span className="eyebrow mono">CHRONOLOGICAL INGRESS</span>
              <Link href="/command-center/traffic" className="mono">All traffic ↗</Link>
            </div>
            <h3>Observed Traffic Pulse</h3>
            {buckets.length ? (
              <div style={{ height: '110px' }}>
                <Line
                  data={{
                    labels: buckets.map(([stamp]) =>
                      new Date(stamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })
                    ),
                    datasets: [
                      {
                        label: 'Requests',
                        data: buckets.map(([, count]) => count),
                        borderColor: '#BFC3C7',
                        backgroundColor: 'rgba(165,160,255,.08)',
                        fill: true,
                        tension: 0.25,
                        pointRadius: 1,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: 'var(--text-muted, #7C8593)', maxTicksLimit: 4, font: { size: 9 } } },
                      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-muted, #7C8593)', precision: 0, font: { size: 9 } } },
                    },
                  }}
                />
              </div>
            ) : null}
            <div className="rail-activity-stream">
              {data.traffic.slice(0, 3).map(evt => (
                <Link key={evt.id} href={inspect('event', evt.id)} className="rail-event-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="method">{evt.method}</span>
                    <code className="mono">{evt.endpoint.slice(0, 22)}{evt.endpoint.length > 22 ? '…' : ''}</code>
                  </div>
                  <span className={`badge badge-${String(evt.status_code)[0]}00 mono`}>{evt.status_code}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rail-box">
            <div className="rail-box-head">
              <span className="eyebrow mono">SECURITY SIGNALS</span>
              <Link href="/command-center/alerts" className="mono">All findings ↗</Link>
            </div>
            <h3>High-Severity Findings</h3>
            <div className="rail-activity-stream">
              {data.alerts.slice(0, 3).map(al => (
                <Link key={al.alert_id} href={inspect('alert', al.alert_id)} className="rail-event-item">
                  <div>
                    <strong style={{ fontSize: '11px', color: 'var(--text-primary, #EDEEEB)', display: 'block' }}>
                      #{al.alert_id} {al.alert_type.replace('_', ' ')}
                    </strong>
                    <small className="mono" style={{ fontSize: '9px', color: 'var(--text-muted, #7C8593)' }}>{date(al.timestamp)}</small>
                  </div>
                  <Badge value={al.severity} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chronological Ingress Activity Strip */}
      <section className="atlas-activity-strip" aria-label="Chronological Ingress Stream">
        <div className="activity-strip-head">
          <span className="eyebrow mono">CHRONOLOGICAL INGRESS STREAM · RECENT ARRIVALS</span>
          <Link href="/command-center/traffic" className="strip-view-all mono">All traffic ({data.traffic.length}) ↗</Link>
        </div>
        <div className="activity-strip-items">
          {data.traffic.slice(0, 6).map(evt => {
            const isBlock = evt.status_code === 429 || evt.status_code === 403
            const isWarn = evt.status_code >= 400 && !isBlock
            const statusClass = isBlock ? 'status-block' : isWarn ? 'status-flag' : 'status-allow'
            return (
              <Link key={evt.id} href={inspect('event', evt.id)} className="activity-strip-card">
                <div className="card-top mono">
                  <span className="card-method">{evt.method}</span>
                  <span className={`card-status ${statusClass}`}>HTTP {evt.status_code}</span>
                </div>
                <code className="card-endpoint mono">{evt.endpoint}</code>
                <div className="card-foot mono">
                  <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="card-inspect-hint">Evidence ↗</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function AlertTable({ data, limit = 100, openedAt }: { data: SecuritySnapshot; limit?: number; openedAt?: number }) {
  return data.alerts.length ? <div className="table-scroll"><table role="table" className="alert-table"><thead><tr><th>Finding</th><th>Severity</th><th>Detection context</th><th>Observed / arrival</th><th>Investigation</th></tr></thead><tbody>{data.alerts.slice(0, limit).map(alert => <tr key={alert.alert_id}><td data-label="Finding"><Link className="record-link" href={inspect('alert', alert.alert_id)}>#{alert.alert_id} <span>{alert.alert_type.replace('_', ' ')}</span> ↗</Link></td><td data-label="Severity"><Badge value={alert.severity}/></td><td data-label="Detection context" className="description-cell">{alert.description}</td><td data-label="Observed / arrival" className="mono">{date(alert.timestamp)}{openedAt !== undefined && <small className={`arrival ${findingIsNew(alert.timestamp, openedAt) ? 'arrival-new' : ''}`}>{findingIsNew(alert.timestamp, openedAt) ? 'New since opened' : 'Historical'}</small>}</td><td data-label="Investigation"><Link className="evidence-link" href={inspect('alert', alert.alert_id)}>{alert.related_event_ids.length ? `View evidence #${alert.related_event_ids[0]} ↗` : 'Review unlinked finding ↗'}</Link></td></tr>)}</tbody></table></div> : <Empty>No findings match this view.</Empty>
}

function Inventory({ data }: { data: SecuritySnapshot }) {
  const [search, setSearch] = useSessionValue('inventory-search','')
  const [shadow, setShadow] = useState(new URLSearchParams(window.location.search).get('shadow') === 'true')
  const [sort, setSort] = useSessionValue('inventory-sort','risk')
  useEffect(() => { setShadow(new URLSearchParams(window.location.search).get('shadow') === 'true') }, [window.location.search])
  const [method, setMethod] = useSessionValue('inventory-method','all')
  const [service, setService] = useSessionValue('inventory-service','all')
  const services = data.hierarchy.services
  const domain = services.find(row=>row.id===service)
  const rows = data.inventory.filter(row => row.endpoint.toLowerCase().includes(search.trim().toLowerCase()) && (!shadow || row.is_shadow) && (method === 'all' || row.method === method) && (!domain || domain.endpoints.some(endpoint=>endpoint.id===row.id))).sort((a, b) => sort === 'risk' ? b.risk_score - a.risk_score : sort === 'activity' ? b.total_calls - a.total_calls : a.endpoint.localeCompare(b.endpoint))
  return <section className="panel"><div className="table-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search endpoints" placeholder="Search endpoints…" value={search} onChange={event => setSearch(event.target.value)}/></label><select aria-label="Service domain" value={service} onChange={event=>setService(event.target.value)}><option value="all">All service domains</option>{services.map(row=><option key={row.id} value={row.id}>{row.name} ({row.endpoint_count})</option>)}</select><select aria-label="HTTP method" value={method} onChange={event => setMethod(event.target.value)}><option value="all">All methods</option>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(value => <option key={value}>{value}</option>)}</select><label className="checkbox-label"><input type="checkbox" checked={shadow} onChange={event => setShadow(event.target.checked)}/>Shadow only</label><select aria-label="Sort endpoints" value={sort} onChange={event => setSort(event.target.value)}><option value="risk">Highest risk</option><option value="activity">Most requests</option><option value="path">Endpoint A–Z</option></select><button className="filter-reset" onClick={() => { setSearch(''); setMethod('all'); setShadow(false); setSort('risk'); setService('all') }}>Clear filters</button><span className="result-count mono" role="status">{rows.length} endpoints</span></div><div className="table-scroll"><table role="table" className="inventory-table"><thead><tr><th>Method / endpoint</th><th>Classification</th><th>Risk score</th><th>Auth observed</th><th>Requests</th><th>Last seen</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Method / endpoint"><Link className="endpoint-link" href={inspect('endpoint', row.id)}><span className="method">{row.method}</span><code>{row.endpoint}</code><span>↗</span></Link></td><td data-label="Classification"><Badge value={row.is_shadow ? 'shadow' : 'managed'}/><small className="request-time">{row.total_calls ? 'Observed locally' : 'Registered only'}</small></td><td data-label="Risk score">{row.total_calls ? <Risk score={row.risk_score}/> : <span className="muted">Not evaluated</span>}</td><td data-label="Auth observed">{row.auth_type}</td><td data-label="Requests" className="mono">{row.total_calls}</td><td data-label="Last seen" className="mono nowrap">{date(row.last_seen)}</td></tr>)}</tbody></table></div>{!rows.length && <Empty>No endpoints match these filters.</Empty>}<div className="table-note">Inventory reflects persisted observations, including historical demo records. Authentication is an observed signal, not proof of enforced access control.</div></section>
}

function Traffic({ data }: { data: SecuritySnapshot }) {
  return <CompactTraffic data={data}/>
}

function Alerts({ data }: { data: SecuritySnapshot }) {
  return <ThreatFindings data={data}/>
}

function RiskIntelligence({ data }: { data: SecuritySnapshot }) {
  const [viewMode, setViewMode] = useSessionValue('risk-view','hierarchy')
  const hierarchy = data.hierarchy
  const platform = hierarchy?.platform

  return <div className="risk-intelligence-view">
    <div className="view-mode-switch" role="tablist" aria-label="Risk view mode">
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'hierarchy'}
        className={`mode-button ${viewMode === 'hierarchy' ? 'active' : ''}`}
        onClick={() => setViewMode('hierarchy')}
      >
        Platform hierarchy
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'flat'}
        className={`mode-button ${viewMode === 'flat' ? 'active' : ''}`}
        onClick={() => setViewMode('flat')}
      >
        Endpoint scores
      </button>
    </div>

    {viewMode === 'hierarchy' && platform && <RiskHierarchy data={hierarchy}/>}

    {(viewMode === 'flat' || !platform) && (
      <section className="risk-list">
        {data.risk.length ? data.risk.map(score => (
          <details className="panel risk-detail" key={score.score_id}>
            <summary>
              <div>
                <span className="eyebrow">ENDPOINT EXPOSURE</span>
                <h2 className="mono">{score.target_id}</h2>
              </div>
              {score.risk_level === 'NOT_OBSERVED' ? <span>Not evaluated</span> : <Risk score={score.score} />}
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

function ExecutionFlow({ path, data }: { data: SecuritySnapshot; path: string }) {
  const query = new URLSearchParams(path.split('?')[1] || '')
  const initialAlertId = query.get('alert') || undefined
  const initialEventId = query.get('event') ? Number(query.get('event')) : undefined

  const [flow, setFlow] = useState<ExecutionFlowResponse | null>(null)
  const selectedAlert = initialAlertId
  const selectedEvent = initialEventId
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
          // Sync dropdown to the server's auto-selected signal on first load
          // Keep auto-selection in the response, not in state that causes a duplicate fetch.
          // Auto-focus the most interesting stage (triggered detection or alert)
          const triggerIndex = res.stages.findIndex(s => {
            const st = s.status.toLowerCase()
            return st === 'flagged' || st === 'triggered' || st === 'critical' || st === 'high' || st === 'medium'
          })
          setSelectedStageIndex(current => selectedAlert || selectedEvent ? current : triggerIndex >= 0 ? triggerIndex : 0)
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
  }, [selectedAlert, selectedEvent, data.alerts[0]?.alert_id, data.traffic[0]?.id])

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
              value={selectedAlert ? `alert:${selectedAlert}` : selectedEvent ? `traffic:${selectedEvent}` : flow?.selected_alert_id ? `alert:${flow.selected_alert_id}` : flow?.selected_event_id ? `traffic:${flow.selected_event_id}` : ''}
              onChange={e => {
                const val = e.target.value
                if (val.startsWith('alert:')) {
                  navigate(`/command-center/flow?alert=${encodeURIComponent(val.replace('alert:', ''))}`)
                  setSelectedStageIndex(0)
                } else if (val.startsWith('traffic:')) {
                  navigate(`/command-center/flow?event=${encodeURIComponent(val.replace('traffic:', ''))}`)
                  setSelectedStageIndex(0)
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
  const requestedAlert = query.get('alert')
  const loadedAlert = data.alerts.find(row => row.alert_id === requestedAlert)
  const [resolvedAlert, setResolvedAlert] = useState<SecurityAlert | null>(null)
  const [alertError, setAlertError] = useState('')

  useEffect(() => {
    setResolvedAlert(null)
    setAlertError('')
    if (!requestedAlert || loadedAlert) return
    const controller = new AbortController()
    productRequest<SecurityAlert>(`findings/${encodeURIComponent(requestedAlert)}`, controller.signal)
      .then(result => { if (!controller.signal.aborted) setResolvedAlert(result) })
      .catch(reason => { if (!controller.signal.aborted) setAlertError(reason.message) })
    return () => controller.abort()
  }, [requestedAlert, loadedAlert?.alert_id])

  const alert = loadedAlert || (resolvedAlert?.alert_id === requestedAlert ? resolvedAlert : undefined)
  const endpoint = data.inventory.find(row => String(row.id) === query.get('endpoint'))
  const eventId = query.get('event') || alert?.related_event_ids[0]
  const [traffic, setTraffic] = useState<APITrafficLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setTraffic(null)
    setError(null)
    setLoading(false)
    if (eventId) {
      setLoading(true)
      api.getTrafficLogById(Number(eventId), controller.signal)
        .then(log => { if (active) setTraffic(log) })
        .catch(reason => { if (active) setError(reason.message) })
        .finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false; controller.abort() }
  }, [eventId])

  if (endpoint) {
    return (
      <div className="evidence-desk">
        <div className="evidence-navigation-links">
          <Link className="evidence-back-pill" href="/command-center/inventory">
            ← Back to API inventory
          </Link>
        </div>
        <EndpointEvidence endpoint={endpoint} />
      </div>
    )
  }

  if (!alert && !eventId) {
    return (
      <div className="evidence-desk">
        <section className="panel">
          <Empty>{query.get('alert') ? (alertError || 'Loading persisted finding…') : 'Start with a finding, endpoint or traffic event to follow its evidence.'}</Empty>
          <div className="empty-actions">
            <Link className="button secondary" href="/command-center/alerts">Browse findings ↗</Link>
            <Link className="text-link" href="/command-center/inventory">Browse inventory ↗</Link>
          </div>
        </section>
      </div>
    )
  }

  const backTarget = traffic?.source === 'gateway' ? '/command-center/gateway' : alert ? '/command-center/alerts' : '/command-center/traffic'
  const backLabel = traffic?.source === 'gateway' ? 'Secure Gateway' : alert ? 'Threat findings' : 'Traffic activity'

  return (
    <div className="evidence-desk" aria-label="Forensic Evidence Desk">
      <div className="evidence-navigation-links">
        <Link className="evidence-back-pill" href={backTarget}>
          ← Back to {backLabel}
        </Link>
        {alert && (
          <Link className="evidence-back-pill" href={`/command-center/flow?alert=${encodeURIComponent(alert.alert_id)}`}>
            Trace in Execution Flow →
          </Link>
        )}
      </div>

      <div className="evidence-desk-header">
        <div>
          <span className="eyebrow">FORENSIC EVIDENCE DOSSIER</span>
          <h2>
            {alert ? `Finding #${alert.alert_id} — ${alert.alert_type.replace('_', ' ')}` : `Traffic Evidence #${eventId}`}
          </h2>
        </div>
        {alert && <Badge value={alert.severity} />}
      </div>

      <div className="evidence-desk-dossier">
        {alert && (
          <article className="evidence-card">
            <h3>
              <span>Finding Analysis</span>
              <Badge value={alert.severity} />
            </h3>
            <p>{alert.description}</p>
            <dl className="evidence-meta-table">
              <dt>OBSERVED ARRIVAL</dt>
              <dd>{date(alert.timestamp)}</dd>
              <dt>DETECTION METHOD</dt>
              <dd>{alert.detection_method}</dd>
              <dt>LINKED EVIDENCE</dt>
              <dd>{alert.related_event_ids.length ? `#${alert.related_event_ids.join(', #')}` : 'Historical baseline'}</dd>
            </dl>
            <div className="evidence-action-box">
              <strong>RECOMMENDED NEXT STEP</strong>
              <p>{alert.recommended_action}</p>
            </div>
          </article>
        )}

        <article className="evidence-card">
          <h3>
            <span>Persisted Request Record</span>
            {eventId ? <code style={{ fontSize: '11px' }}>#{eventId}</code> : null}
          </h3>

          {loading && <p role="status" className="mono muted">Retrieving correlated traffic payload…</p>}
          {error && <p role="alert" className="error-text">{error}</p>}
          {!eventId && !loading && (
            <p style={{ color: '#657572', fontStyle: 'italic' }}>
              This historical finding has no linked traffic record. No evidence has been inferred.
            </p>
          )}

          {traffic && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="method">{traffic.method}</span>
                <code style={{ fontSize: '13px', fontWeight: 600 }}>{traffic.endpoint}</code>
                <span className={`badge badge-${String(traffic.status_code)[0]}00`}>
                  HTTP {traffic.status_code}
                </span>
              </div>

              <dl className="evidence-meta-table">
                <dt>CALLER IP</dt>
                <dd>{traffic.caller_ip || '127.0.0.1'}</dd>
                <dt>USER IDENTITY</dt>
                <dd>{traffic.user_id || 'Unauthenticated / Guest'}</dd>
                <dt>TARGET RESOURCE</dt>
                <dd>{traffic.target_resource_id || 'Global perimeter'}</dd>
                <dt>AUTH SIGNAL</dt>
                <dd>{traffic.auth_type || 'None'}</dd>
                <dt>PAYLOAD BYTES</dt>
                <dd>{traffic.payload_size_bytes != null ? `${traffic.payload_size_bytes} B` : '0 B'}</dd>
                <dt>RECORDED TIMESTAMP</dt>
                <dd>{date(traffic.timestamp)}</dd>

                {traffic.source === 'gateway' && (
                  <>
                    <dt>GATEWAY VERDICT</dt>
                    <dd style={{ fontWeight: 600, color: traffic.gateway_decision === 'ALLOW' ? 'var(--allow, #53CE9A)' : traffic.gateway_decision === 'FLAG' ? 'var(--flag, #E9B969)' : 'var(--block, #EB7777)' }}>
                      {traffic.gateway_decision}
                    </dd>
                    <dt>DECISION REASON</dt>
                    <dd>{traffic.decision_reason || 'Inferred by rule'}</dd>
                    <dt>UPSTREAM STATUS</dt>
                    <dd>{traffic.upstream_status_code ? `HTTP ${traffic.upstream_status_code}` : 'Terminated at perimeter'}</dd>
                    <dt>MEASURED LATENCY</dt>
                    <dd>{traffic.latency_ms != null ? `${traffic.latency_ms.toFixed(1)} ms` : '0.0 ms'}</dd>
                    <dt>REQUEST HASH</dt>
                    <dd style={{ fontSize: '10px' }}>{traffic.request_id || 'Synthetic'}</dd>
                  </>
                )}
              </dl>

              {traffic.finding_ids?.length ? (
                <div style={{ borderTop: '1px solid var(--paper-border)', paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#657572', fontFamily: 'var(--mono)', display: 'block', marginBottom: '6px' }}>
                    LINKED SECURITY FINDINGS:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {traffic.finding_ids.map(id => (
                      <Link key={id} href={inspect('alert', id)} className="evidence-link">
                        Finding #{id} ↗
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </article>
      </div>
    </div>
  )
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
  const current = section === 'connect' ? ['connect','Connect an API'] : tabs.find(([key]) => key === section)
  const { data, error, updated, refreshing, refresh, signals } = useSecurityData()
  const subtitles: Record<string, string> = {
    '': 'The full picture. From exposure to evidence.',
    gateway: 'Fixed local proxy, live policy decisions and verifiable networking scenarios.',
    inventory: 'Registered and observed endpoints, including the undocumented.',
    traffic: 'Actual requests, recorded at the API edge.',
    alerts: 'Behavioral signals with an investigation path.',
    risk: 'Exposure scores with every contributing factor.',
    flow: 'Step-by-step visual lineage from edge request to forensic evidence.',
    investigation: 'Follow a finding back to its originating request.',
    connect: 'Document your authorized API. Know exactly what is — and is not — monitored.'
  }
  return (
    <div className="command-shell command-editorial">
      <VeilContextualBackdrop />
      <header className="command-top-nav" role="banner">
        <div className="top-nav-inner">
          <div className="top-nav-left">
            <Link href="/" className="top-nav-brand" aria-label="Hyperion home">
              <Brand compact />
            </Link>
            <span className="top-nav-badge mono" aria-hidden="true">COMMAND CENTER</span>
          </div>

          <nav
            className="top-nav-tabs"
            aria-label="Workspace navigation"
            style={{ '--nav-index': Math.max(0, tabs.findIndex(([key]) => key === section)) } as React.CSSProperties}
          >
            {tabs.map(([key, label, symbol]) => {
              const active = section === key
              return (
                <Link
                  key={key}
                  href={`/command-center${key ? '/' + key : ''}`}
                  className={`top-nav-tab ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="tab-glyph" aria-hidden="true">{symbol}</span>
                  <span className="tab-label">{label}</span>
                  {active && <span className="top-nav-active-line" aria-hidden="true" />}
                </Link>
              )
            })}
          </nav>

          <div className="top-nav-right">
            <div className="top-nav-actions">
              <Link
                href="/command-center/connect"
                className={`top-nav-pill ${section === 'connect' ? 'active' : ''}`}
              >
                Connect API ↗
              </Link>
              <Link href="/watch" className="top-nav-pill">
                Watch ↗
              </Link>
            </div>

            <span className={`connection ${error ? 'connection-error' : ''}`}>
              <i />
              {error ? 'Connection interrupted' : data ? 'Backend connected' : 'Connecting'}
            </span>

            <label className="mobile-navigation">
              <span className="sr-only">Workspace</span>
              <select
                aria-label="Command center page"
                value={section}
                onChange={event => navigate(`/command-center${event.target.value ? '/' + event.target.value : ''}`)}
              >
                {tabs.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
                <option value="connect">Connect API</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="command-body">
        <main id="main" className="command-main">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">OPERATIONAL INTELLIGENCE</div>
              <h1>{current?.[1] || 'Workspace not found'}</h1>
              <p>{subtitles[section]}</p>
            </div>
            <div className="refresh-control">
              <span className="mono">
                {updated ? `Synced ${updated.toLocaleTimeString()}` : 'Awaiting telemetry'}
                <small>REFRESHES EVERY 5 SECONDS</small>
              </span>
              <button
                className="icon-button"
                aria-label="Refresh telemetry"
                disabled={refreshing}
                onClick={refresh}
              >
                <span className={refreshing ? 'spin' : ''}>↻</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error} {data ? 'Showing the last successful snapshot.' : 'Check the configured backend service, then retry.'}
              <button onClick={refresh}>Retry ↗</button>
            </div>
          )}

          {section !== 'gateway' && <details className="live-signal-disclosure" open={false}>
            <summary>Live Signal · {error ? 'connection interrupted' : 'observed telemetry'}</summary>
            <LiveSignal state={signals} disconnected={Boolean(error)} />
          </details>}

          {section === '' && <DemoControl onComplete={refresh} />}

          <span className="sr-only" role="status">
            {refreshing ? 'Refreshing telemetry' : 'Telemetry refresh complete'}
          </span>

          {section === 'gateway' ? <SecureGateway /> : !data ? (
            <div className="panel empty-state" role="status">
              {error ? 'Telemetry unavailable.' : 'Reading persisted security telemetry…'}
            </div>
          ) : (
            <RouteView section={section}>
              {view => (
                <>
                  {view === '' ? <Overview data={data} /> :
                   view === 'connect' ? <ConnectAPI /> :
                   view === 'inventory' ? <Inventory data={data} /> :
                   view === 'traffic' ? <Traffic data={data} /> :
                   view === 'alerts' ? <Alerts data={data} /> :
                   view === 'risk' ? <RiskIntelligence data={data} /> :
                   view === 'flow' ? <ExecutionFlow data={data} path={path} /> :
                   view === 'investigation' ? <Investigation data={data} path={path} /> :
                   <Empty><Link href="/command-center">Return to overview ↗</Link></Empty>}
                </>
              )}
            </RouteView>
          )}

          <footer className="workspace-footer">
            <span>OBSERVE → UNDERSTAND → INVESTIGATE</span>
            <Link href="/" className="return-link">← Return to product site</Link>
            <span>PERIODIC REFRESH · 5 SECOND INTERVAL</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
