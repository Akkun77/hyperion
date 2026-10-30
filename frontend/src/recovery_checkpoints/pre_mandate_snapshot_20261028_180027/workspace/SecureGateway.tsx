import { useEffect, useState } from 'react'
import { API_BASE } from '../api'
import { Link } from '../router'
import EnforcementStage, { GatewayEventData, Decision } from './EnforcementStage'
import './secure-gateway.css'

type GatewayStatus = {
  enabled: boolean
  shadow_policy: 'FLAG' | 'BLOCK'
  rate_limit: number
  rate_window_seconds: number
  upstream: string
}

type EventPage = {
  total: number
  page: number
  page_size: number
  items: GatewayEventData[]
}

type Scenario = 'legitimate' | 'shadow' | 'rate' | 'bola' | 'tamper'

type DemoResult = {
  scenario: Scenario
  concept: string
  verified: boolean
  message: string
  request_count: number
  event: GatewayEventData
  findings: { alert_id: string; type: string; severity: string }[]
}

const scenarios: { id: Scenario; name: string; tag: string; detail: string }[] = [
  { id: 'legitimate', name: '01 Legitimate Request', tag: 'ALLOWLISTED', detail: 'Allowlisted GET to protected profile (/api/v1/users/user_101)' },
  { id: 'shadow', name: '02 Unknown Route', tag: 'SHADOW POLICY', detail: 'Undeclared route (/api/v1/internal/debug) flagged or blocked per policy' },
  { id: 'rate', name: '03 Rate Limit Burst', tag: 'RATE LIMITER', detail: 'Rapid burst exceeding configured window, returning 429 BLOCK' },
  { id: 'bola', name: '04 Synthetic BOLA', tag: 'TENANT GUARD', detail: 'Cross-tenant resource access creating linked forensic alert' },
  { id: 'tamper', name: '05 Parameter Tampering', tag: 'INTEGRITY SHIELD', detail: 'Mismatched payment source flagged with security finding' },
]

const decisionText = (val: Decision) => val || 'Not recorded'
const time = (stamp: string) => new Date(stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function SecureGateway() {
  const [secretInput, setSecretInput] = useState('')
  const [secret, setSecret] = useState('')
  const [policy, setPolicy] = useState<GatewayStatus | null>(null)
  const [draftEnabled, setDraftEnabled] = useState(true)
  const [draftShadow, setDraftShadow] = useState<'FLAG' | 'BLOCK'>('FLAG')
  const [policyBusy, setPolicyBusy] = useState(false)
  const [policyError, setPolicyError] = useState('')
  const [showPolicyDrawer, setShowPolicyDrawer] = useState(false)

  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [events, setEvents] = useState<EventPage | null>(null)
  const [eventsBusy, setEventsBusy] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterDecision, setFilterDecision] = useState<'ALL' | 'ALLOW' | 'FLAG' | 'BLOCK'>('ALL')

  const [authorized, setAuthorized] = useState(false)
  const [running, setRunning] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [demoError, setDemoError] = useState('')
  const [results, setResults] = useState<Partial<Record<Scenario, DemoResult>>>({})
  const [triggerKey, setTriggerKey] = useState(0)

  // Fetch recorded requests
  useEffect(() => {
    const controller = new AbortController()
    setEventsBusy(true)
    setEventsError('')

    fetch(`${API_BASE}/api/governance/requests?period=all&page=${page}&page_size=25&sort=time&order=desc`, {
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Request ledger unavailable (${res.status}).`)
        return res.json() as Promise<EventPage>
      })
      .then(val => {
        if (!controller.signal.aborted) setEvents(val)
      })
      .catch(err => {
        if (!controller.signal.aborted) setEventsError(err?.message || 'Error loading requests.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsBusy(false)
      })

    return () => controller.abort()
  }, [page, revision])

  const acceptPolicy = (val: GatewayStatus) => {
    setPolicy(val)
    setDraftEnabled(val.enabled)
    setDraftShadow(val.shadow_policy)
  }

  const policyRequest = async (key: string, update?: { enabled: boolean; shadow_policy: 'FLAG' | 'BLOCK' }) => {
    const res = await fetch(`${API_BASE}/api/governance/gateway`, {
      method: update ? 'POST' : 'GET',
      headers: {
        'x-gateway-admin-secret': key,
        ...(update ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(update ? { body: JSON.stringify(update) } : {}),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : `Gateway controls unavailable (${res.status}).`)
    return body as GatewayStatus
  }

  const unlock = async (keyToUse?: string) => {
    const key = keyToUse || secretInput
    if (!key) return
    setPolicyBusy(true)
    setPolicyError('')
    try {
      acceptPolicy(await policyRequest(key))
      setSecret(key)
    } catch (err: any) {
      setPolicyError(err.message || 'Unlock failed.')
    } finally {
      setPolicyBusy(false)
    }
  }

  const unlockWithDefaultKey = () => {
    const defaultSecret = '7EA564262EFAF2056BE9ABC77DE04ACA48A8A5243FF6C5CF99F564EE8A2615C5'
    setSecretInput(defaultSecret)
    void unlock(defaultSecret)
  }

  const applyPolicy = async () => {
    if (!secret) return
    setPolicyBusy(true)
    setPolicyError('')
    try {
      acceptPolicy(await policyRequest(secret, { enabled: draftEnabled, shadow_policy: draftShadow }))
    } catch (err: any) {
      setPolicyError(err.message || 'Policy update failed.')
    } finally {
      setPolicyBusy(false)
    }
  }

  const executeScenario = async (scenario: Scenario) => {
    setActiveScenario(scenario)
    const res = await fetch(`${API_BASE}/api/governance/gateway-demo/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, authorized: true }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : `Demonstration failed (${res.status}).`)
    const result = body as DemoResult
    setResults(curr => ({ ...curr, [scenario]: result }))
    setSelectedId(result.event.id)
    setTriggerKey(k => k + 1)
    setPage(1)
    setRevision(r => r + 1)
  }

  const run = async (selected: Scenario | 'all') => {
    if (!authorized || running) return
    setRunning(true)
    setDemoError('')
    let currentScenario: Scenario | null = null
    try {
      for (const scenario of selected === 'all' ? scenarios.map(s => s.id) : [selected]) {
        currentScenario = scenario
        await executeScenario(scenario)
      }
    } catch (err: any) {
      setDemoError(`${currentScenario || selected}: ${err.message || 'Execution error.'}`)
    } finally {
      setRunning(false)
      setActiveScenario(null)
    }
  }

  const gatewayRows = events?.items.filter(row => row.source === 'gateway') || []
  const filteredRows = gatewayRows.filter(row => {
    if (filterDecision === 'ALL') return true
    return row.gateway_decision === filterDecision
  })

  const selectedEvent = gatewayRows.find(row => row.id === selectedId) || gatewayRows[0] || null

  return (
    <div className="sg-observatory-page" aria-label="Secure Gateway Observatory">
      {/* Tactical Status HUD Bar */}
      <div className="sg-tactical-hud">
        <div className="sg-hud-item">
          <span className="sg-hud-kicker">CORE ENFORCEMENT</span>
          <strong className={`sg-status-indicator ${policy?.enabled !== false ? 'status-active' : 'status-warn'}`}>
            <span className="sg-dot" />
            {policy ? (policy.enabled ? 'ACTIVE REVERSE PROXY' : 'BYPASS MODE') : 'PROXY ARMED (8000)'}
          </strong>
        </div>

        <div className="sg-hud-item">
          <span className="sg-hud-kicker">SHADOW ROUTE POLICY</span>
          <strong className="sg-policy-mode">
            {policy ? (
              <span className={policy.shadow_policy === 'BLOCK' ? 'mode-block' : 'mode-flag'}>
                {policy.shadow_policy} (UNKNOWN ROUTES)
              </span>
            ) : (
              'FLAG (AUDIT & PASS)'
            )}
          </strong>
        </div>

        <div className="sg-hud-item">
          <span className="sg-hud-kicker">UPSTREAM BACKEND</span>
          <code className="sg-hud-code">127.0.0.1:8001 [PROTECTED]</code>
        </div>

        <div className="sg-hud-item sg-hud-policy-action">
          <button
            type="button"
            className="sg-policy-toggle-btn"
            onClick={() => setShowPolicyDrawer(!showPolicyDrawer)}
          >
            {secret ? 'Configure Policy ⚙' : 'Unlock Policy Admin 🔒'}
          </button>
        </div>
      </div>

      {/* Policy Admin Drawer */}
      {showPolicyDrawer && (
        <div className="sg-policy-drawer" role="region" aria-label="Gateway policy controls">
          <div className="sg-drawer-head">
            <h3>Gateway Policy Administration</h3>
            <button
              type="button"
              className="sg-drawer-close"
              onClick={() => setShowPolicyDrawer(false)}
            >
              ✕
            </button>
          </div>

          {!secret ? (
            <div className="sg-unlock-panel">
              <p>Authorize with the local gateway admin secret to adjust shadow enforcement and rate windows.</p>
              <div className="sg-unlock-form">
                <input
                  type="password"
                  placeholder="Enter gateway admin secret…"
                  value={secretInput}
                  onChange={e => setSecretInput(e.target.value)}
                />
                <button
                  type="button"
                  className="sg-btn-primary"
                  onClick={() => unlock()}
                  disabled={policyBusy || !secretInput}
                >
                  {policyBusy ? 'Verifying…' : 'Unlock Controls'}
                </button>
                <button
                  type="button"
                  className="sg-btn-secondary"
                  onClick={unlockWithDefaultKey}
                  disabled={policyBusy}
                >
                  Use Local Key
                </button>
              </div>
            </div>
          ) : (
            <div className="sg-active-policy-panel">
              <div className="sg-policy-controls-grid">
                <label className="sg-control-field">
                  <span>Enforcement Proxy:</span>
                  <select
                    value={String(draftEnabled)}
                    onChange={e => setDraftEnabled(e.target.value === 'true')}
                  >
                    <option value="true">Enabled (Active Inspection)</option>
                    <option value="false">Disabled (Pass-Through)</option>
                  </select>
                </label>

                <label className="sg-control-field">
                  <span>Unknown Route Action:</span>
                  <select
                    value={draftShadow}
                    onChange={e => setDraftShadow(e.target.value as 'FLAG' | 'BLOCK')}
                  >
                    <option value="FLAG">FLAG — Audit & Allow Upstream</option>
                    <option value="BLOCK">BLOCK — Zero Trust Terminate</option>
                  </select>
                </label>
              </div>

              <div className="sg-policy-actions">
                <button
                  type="button"
                  className="sg-btn-primary"
                  onClick={applyPolicy}
                  disabled={
                    policyBusy ||
                    Boolean(policy && draftEnabled === policy.enabled && draftShadow === policy.shadow_policy)
                  }
                >
                  {policyBusy ? 'Applying…' : 'Apply Policy Rules'}
                </button>
                <button
                  type="button"
                  className="sg-btn-secondary"
                  onClick={() => {
                    setSecret('')
                    setPolicy(null)
                  }}
                >
                  Lock
                </button>
              </div>
            </div>
          )}

          {policyError && <p className="sg-error-banner" role="alert">{policyError}</p>}
        </div>
      )}

      {/* Hero: Large-Scale Panoramic Enforcement Chamber */}
      <section className="sg-hero-visualization" aria-labelledby="sg-chamber-title">
        <div className="sg-viz-heading">
          <div>
            <span className="sg-kicker">ENFORCEMENT CHAMBER</span>
            <h2 id="sg-chamber-title">Real-Time Causal Gateway Signal</h2>
          </div>
          <button
            type="button"
            className="sg-refresh-btn"
            onClick={() => setRevision(r => r + 1)}
            disabled={eventsBusy}
          >
            Refresh Records ↻
          </button>
        </div>

        <EnforcementStage
          event={selectedEvent}
          triggerKey={triggerKey}
        />
      </section>

      {/* Middle: Five-Scenario Tactical Demonstration Console */}
      <section className="sg-demonstration-deck" aria-labelledby="sg-demo-title">
        <div className="sg-deck-header">
          <div>
            <span className="sg-kicker">NETWORKING DEMONSTRATION</span>
            <h2 id="sg-demo-title">Execute Verifiable Security Scenarios</h2>
            <p>
              Each scenario transmits authentic synthetic requests through the gateway, validates the returned HTTP response and persisted evidence ledger, and triggers causal signal tracing above.
            </p>
          </div>

          <div className="sg-master-runner">
            <label className="sg-auth-checkbox">
              <input
                type="checkbox"
                checked={authorized}
                onChange={e => setAuthorized(e.target.checked)}
              />
              <span>Authorize local synthetic requests in demonstration database</span>
            </label>

            <button
              type="button"
              className="sg-run-all-btn"
              disabled={!authorized || running}
              onClick={() => run('all')}
            >
              {running ? `Executing ${activeScenario || 'scenario'}…` : 'Run All Five Scenarios →'}
            </button>
          </div>
        </div>

        {demoError && <div className="sg-error-banner" role="alert">{demoError}</div>}

        <div className="sg-scenarios-deck-grid">
          {scenarios.map(item => {
            const result = results[item.id]
            const isItemRunning = activeScenario === item.id

            return (
              <article
                key={item.id}
                className={`scenario-card ${result ? 'has-result' : ''} ${
                  selectedEvent?.id === result?.event.id ? 'is-selected-card' : ''
                }`}
              >
                <div className="scenario-card-head">
                  <span className="scenario-tag">{item.tag}</span>
                  <h3>{item.name}</h3>
                </div>
                <p className="scenario-detail">{item.detail}</p>

                <button
                  type="button"
                  className="scenario-trigger-btn"
                  disabled={!authorized || running}
                  onClick={() => run(item.id)}
                >
                  {isItemRunning ? 'Processing…' : `Run ${item.name.slice(3)}`}
                </button>

                {result && (
                  <div className="scenario-result-badge" role="status">
                    <div className="result-headline">
                      <strong className={result.verified ? 'result-verified' : 'result-failed'}>
                        {result.verified ? '✓ Verified' : 'Needs Review'}
                      </strong>
                      <span className="result-http">HTTP {result.event.status_code}</span>
                      <span className={`result-decision dec-${result.event.gateway_decision?.toLowerCase()}`}>
                        {decisionText(result.event.gateway_decision)}
                      </span>
                    </div>

                    <div className="result-meta">
                      <span>Reason: {result.event.decision_reason || 'ALLOWLISTED'}</span>
                      <span>Latency: {result.event.latency_ms != null ? `${result.event.latency_ms.toFixed(1)} ms` : '—'}</span>
                    </div>

                    <div className="result-actions">
                      <button
                        type="button"
                        className="btn-inspect-result"
                        onClick={() => {
                          setSelectedId(result.event.id)
                          setTriggerKey(k => k + 1)
                        }}
                      >
                        Inspect Signal #{result.event.id}
                      </button>
                      <Link
                        href={`/command-center/investigation?event=${result.event.id}`}
                        className="link-evidence"
                      >
                        Evidence #{result.event.id} →
                      </Link>
                    </div>

                    {result.findings.map(f => (
                      <Link
                        key={f.alert_id}
                        href={`/command-center/investigation?alert=${f.alert_id}`}
                        className="finding-chip"
                      >
                        {f.type} Alert #{f.alert_id} →
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {/* Bottom: Filterable Evidence Ledger */}
      <section className="sg-evidence-ledger" aria-label="Incoming recorded requests">
        <div className="sg-ledger-header">
          <div>
            <span className="sg-kicker">EVIDENCE LEDGER</span>
            <h2>Recorded Gateway Ingress</h2>
            <p className="sg-ledger-summary">
              {events ? `${gatewayRows.length} requests on page ${events.page} of ${Math.max(1, Math.ceil(events.total / 25))} (Total: ${events.total} recorded events)` : 'Loading records…'}
            </p>
          </div>

          <div className="sg-ledger-filters">
            <span className="filter-label">Filter Verdict:</span>
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${filterDecision === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setFilterDecision('ALL')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-pill pill-allow ${filterDecision === 'ALLOW' ? 'is-active' : ''}`}
                onClick={() => setFilterDecision('ALLOW')}
              >
                ALLOW
              </button>
              <button
                type="button"
                className={`filter-pill pill-flag ${filterDecision === 'FLAG' ? 'is-active' : ''}`}
                onClick={() => setFilterDecision('FLAG')}
              >
                FLAG
              </button>
              <button
                type="button"
                className={`filter-pill pill-block ${filterDecision === 'BLOCK' ? 'is-active' : ''}`}
                onClick={() => setFilterDecision('BLOCK')}
              >
                BLOCK
              </button>
            </div>
          </div>
        </div>

        {eventsError && <div className="sg-error-banner" role="alert">{eventsError}</div>}

        <div className="sg-table-container">
          <table className="sg-evidence-table">
            <caption>Persisted gateway events. Select an entry to trace its causal signal path.</caption>
            <thead>
              <tr>
                <th scope="col">Inspect</th>
                <th scope="col">Evidence ID & Time</th>
                <th scope="col">Request Endpoint</th>
                <th scope="col">Gateway Verdict</th>
                <th scope="col">Decision Reason</th>
                <th scope="col">HTTP / Upstream</th>
                <th scope="col">Latency</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const isSelected = selectedEvent?.id === row.id
                const isRowAllow = row.gateway_decision === 'ALLOW'
                const isRowFlag = row.gateway_decision === 'FLAG'
                const isRowBlock = row.gateway_decision === 'BLOCK'

                return (
                  <tr
                    key={row.id}
                    className={`sg-table-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => {
                      setSelectedId(row.id)
                      setTriggerKey(k => k + 1)
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        className="sg-inspect-row-btn"
                        aria-pressed={isSelected}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedId(row.id)
                          setTriggerKey(k => k + 1)
                        }}
                      >
                        Inspect #{row.id}
                      </button>
                    </td>
                    <td>
                      <span className="sg-evidence-id">#{row.id}</span>
                      <small className="sg-time-sub">{time(row.timestamp)}</small>
                    </td>
                    <td>
                      <div className="sg-endpoint-cell">
                        <span className={`method-badge method-${row.method.toLowerCase()}`}>
                          {row.method}
                        </span>
                        <code className="endpoint-code">{row.endpoint}</code>
                      </div>
                    </td>
                    <td>
                      <strong
                        className={`decision-pill ${
                          isRowAllow ? 'pill-allow' : isRowFlag ? 'pill-flag' : isRowBlock ? 'pill-block' : ''
                        }`}
                      >
                        {decisionText(row.gateway_decision)}
                      </strong>
                    </td>
                    <td>
                      <span className="sg-reason-text">{row.decision_reason || '—'}</span>
                    </td>
                    <td>
                      <div className="sg-status-cell">
                        <span className="status-main">HTTP {row.status_code}</span>
                        <small className="status-upstream">
                          Upstream: {row.upstream_status_code == null ? 'Not reached' : row.upstream_status_code}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="sg-latency-cell">
                        <span>{row.latency_ms != null ? `${row.latency_ms.toFixed(0)} ms` : '—'}</span>
                        {row.latency_ms != null && (
                          <div className="latency-bar-track">
                            <div
                              className="latency-bar-fill"
                              style={{ width: `${Math.min(100, (row.latency_ms / 1000) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/command-center/investigation?event=${row.id}`}
                        className="sg-link-investigation"
                        onClick={e => e.stopPropagation()}
                      >
                        Evidence →
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {!eventsBusy && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="sg-empty-table-cell">
                    No gateway records match the active filter. Execute a scenario above to observe live enforcement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="sg-pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Newer Records
          </button>
          <span className="pagination-info">
            Page {page} of {Math.max(1, Math.ceil((events?.total || 0) / 25))}
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={!events || page * 25 >= events.total}
            onClick={() => setPage(p => p + 1)}
          >
            Older Records →
          </button>
        </div>
      </section>
    </div>
  )
}
