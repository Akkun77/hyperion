import { useEffect, useRef, useState } from 'react'
import { Link } from '../router'
import SceneTransition from '../components/SceneTransition'
import { DemoResult, productRequest } from './productApi'
import DemoPlaybackControls from './DemoPlaybackControls'
import { useDemoPlayback } from './useDemoPlayback'
import RecordedRisk from './RecordedRisk'

const scenarios = [
  ['bola', 'BOLA'],
  ['normal', 'Normal request'],
  ['scraping', 'Scraping'],
  ['token', 'Token misuse'],
  ['shadow', 'Shadow discovery']
]

interface StageNarrative {
  stageNumber: number
  category: string
  title: string
  explanation: string
  technicalSummary?: string
}

const STAGE_NARRATIVES: Record<number, StageNarrative> = {
  1: {
    stageNumber: 1,
    category: 'REQUEST',
    title: 'A user requests a resource.',
    explanation: 'Authenticated user user_101 transmits a GET request to /api/v1/users/{id} targeting record user_202 belonging to another tenant.',
    technicalSummary: 'GET /api/v1/users/user_202 · Identity: user_101 · Auth: Bearer Token'
  },
  2: {
    stageNumber: 2,
    category: 'ENDPOINT IDENTIFICATION',
    title: 'Hyperion identifies the endpoint.',
    explanation: 'The request is resolved against the managed OpenAPI catalog under Identity & User Service and flagged for sensitive user profile data (PII).',
    technicalSummary: 'Route: /api/v1/users/{id} · Managed Catalog · Contains PII: true'
  },
  3: {
    stageNumber: 3,
    category: 'AUDIT LOG PERSISTENCE',
    title: 'The request and response are recorded.',
    explanation: 'Hyperion logs the incoming request, caller IP, and HTTP status into the immutable SQLite audit ledger for real-time analysis and compliance forensics.',
    technicalSummary: 'Storage: SQLite (traffic_logs) · Event ID registered · Status captured'
  },
  4: {
    stageNumber: 4,
    category: 'AUTHORIZATION EVALUATION',
    title: 'Hyperion evaluates the authorization context.',
    explanation: "Token subject 'user_101' requested resource 'user_202'. The server returned status HTTP 200 instead of expected HTTP 403 Forbidden.",
    technicalSummary: 'Rule: Cross-tenant resource access without ownership validation · HTTP 200 OK'
  },
  5: {
    stageNumber: 5,
    category: 'FINDING DISPATCH',
    title: 'The detector reports its actual finding.',
    explanation: 'BOLA Ownership Detector triggers with CRITICAL severity. Direct object reference bypass is isolated and confirmed.',
    technicalSummary: 'Detector: BOLA Ownership Detector · Threat: BOLA · Severity: CRITICAL'
  },
  6: {
    stageNumber: 6,
    category: 'RISK EXPLANATION',
    title: "The affected endpoint's risk is explained.",
    explanation: 'The risk assessment is read from this execution’s recorded backend evidence.'
  },
  7: {
    stageNumber: 7,
    category: 'EVIDENCE TRACE',
    title: 'The recorded request and alert evidence are revealed.',
    explanation: 'Forensic binding connects the generated Alert to the exact persisted Traffic Event, providing an unalterable trail for investigation.',
    technicalSummary: 'Binding: Cryptographic link Alert ↔ Traffic Event in SQLite ledger'
  }
}

export default function WatchHyperionWork() {
  const [scenario, setScenario] = useState('bola')
  const [authorized, setAuthorized] = useState(false)
  const [result, setResult] = useState<DemoResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { stage, direction, playing, controller } = useDemoPlayback()
  const [loopVariant, setLoopVariant] = useState<'ribbon' | 'full'>('ribbon')
  const emittedStage = useRef('')
  const pendingRun = useRef<AbortController | null>(null)
  useEffect(() => () => pendingRun.current?.abort(), [])

  useEffect(() => {
    if (!result) return
    const selected = result.flow.stages[stage]
    if (!selected) return
    const key = `${result.run_id}:${selected.id}`
    if (emittedStage.current !== key) {
      emittedStage.current = key
      window.dispatchEvent(
        new CustomEvent('hyperion-demo-stage', {
          detail: {
            stage: stage + 1,
            stageId: selected.id,
            finding: stage >= 4 && result.findings.length > 0,
            signals: [
              {
                kind: stage === 4 && result.findings.length ? 'finding' : 'traffic',
                severity: result.findings[0]?.severity
              }
            ],
            runId: result.run_id
          }
        })
      )
    }
  }, [result, stage])

  // Keyboard navigation for stepping through stages
  useEffect(() => {
    if (!result) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))) return
      if (e.key === 'ArrowRight' && stage < result.flow.stages.length - 1) {
        e.preventDefault()
        controller.goTo(stage + 1)
      } else if (e.key === 'ArrowLeft' && stage > 0) {
        e.preventDefault()
        controller.goTo(stage - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [result, stage, controller])

  const switchVariant = (v: 'ribbon' | 'full') => {
    setLoopVariant(v)
    window.dispatchEvent(new CustomEvent('hyperion-loop-variant', { detail: { variant: v } }))
  }

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    controller.stop()
    pendingRun.current?.abort()
    const request = new AbortController()
    pendingRun.current = request
    try {
      const response = await productRequest<DemoResult>('demo/run', request.signal, { scenario, authorized })
      if (request.signal.aborted) return
      if (response.flow?.stages.length !== 7 || !response.selected_request?.id) {
        throw new Error('The backend did not return a complete recorded demonstration.')
      }
      setResult(response)
      controller.start(response.flow.stages.length)
    } catch (reason) {
      if (request.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Controlled execution unavailable.')
      window.dispatchEvent(new CustomEvent('hyperion-demo-reset', { detail: { reset: true } }))
    } finally {
      if (!request.signal.aborted) setBusy(false)
    }
  }

  const selected = result?.flow.stages[stage]
  const currentNarrative = STAGE_NARRATIVES[stage + 1] || {
    stageNumber: stage + 1,
    category: `STAGE 0${stage + 1}`,
    title: selected?.summary || '',
    explanation: selected?.name || ''
  }

  const alertId = result?.flow.selected_alert_id || result?.findings[0]?.alert_id || '1'
  const eventId = result?.selected_request?.id || 2

  return (
    <section className="watch-editorial-experience" aria-label="Watch Hyperion work">
      {/* Visual Identity Caption & Geometry Variant Switcher */}
      <aside className="sculpture-caption-bar" aria-label="Sculpture guidance">
        <p className="watch-sculpture-caption">
          Living security core
        </p>
        <div className="geometry-toggle" role="group" aria-label="Core geometry variant">
          <span className="geometry-toggle-label">Core Geometry:</span>
          <button
            type="button"
            className={`toggle-option ${loopVariant === 'ribbon' ? 'active' : ''}`}
            onClick={() => switchVariant('ribbon')}
          >
            Layered Ribbon
          </button>
          <button
            type="button"
            className={`toggle-option ${loopVariant === 'full' ? 'active' : ''}`}
            onClick={() => switchVariant('full')}
          >
            Full Mass
          </button>
        </div>
      </aside>

      {/* Narrative & Interaction Column */}
      <div className="watch-narrative-column">
        {!result ? (
          <div className="setup-view">
            <header className="watch-header">
              <span className="eyebrow">HYPERION / LIVING SECURITY CORE</span>
              <h1 className="hero-heading">Every API leaves a signal.</h1>
              <p className="hero-subhead">Watch a request become a security finding.</p>
              <p className="hero-lead">
                Follow one API request through Hyperion's security analysis and see the evidence behind the result.
              </p>
            </header>

            {/* Scenario Selection: Restrained Editorial Text Navigation */}
            <nav className="scenario-editorial-nav" aria-label="Controlled scenario selector">
              {scenarios.map(([value, label]) => {
                const isReady = value === 'bola'
                return (
                  <button
                    key={value}
                    type="button"
                    className={`scenario-nav-item ${scenario === value ? 'active' : ''}`}
                    aria-pressed={scenario === value}
                    disabled={busy}
                    onClick={() => {
                      setScenario(value)
                      setResult(null)
                      controller.stop()
                      setError('')
                      window.dispatchEvent(new CustomEvent('hyperion-demo-reset', { detail: { reset: true } }))
                    }}
                  >
                    <span>{label}</span>
                    {!isReady && <small className="status-tag">Controlled Demo</small>}
                  </button>
                )
              })}
            </nav>

            {/* Briefing Area */}
            {scenario === 'bola' ? (
              <div className="scenario-editorial-briefing">
                <span className="eyebrow">CONTROLLED BOLA SCENARIO BRIEFING</span>
                <p className="briefing-lead">
                  Authenticated user <code>user_101</code> attempts to access account details belonging to{' '}
                  <code>user_202</code> at <code>GET /api/v1/users/{'{id}'}</code>. In this deliberately vulnerable demo, the server
                  returns HTTP 200 instead of HTTP 403 Forbidden, triggering Hyperion’s Broken Object-Level Authorization ownership detector.
                </p>
              </div>
            ) : (
              <div className="scenario-editorial-briefing">
                <p className="briefing-lead">
                  Fixed local targets only. This appends{' '}
                  {scenario === 'scraping' ? '16' : scenario === 'token' ? '3' : '1'} clearly controlled request
                  {scenario === 'scraping' || scenario === 'token' ? 's' : ''}; historical data is retained.
                </p>
              </div>
            )}

            {/* Explicit Authorization & Refined Run Action */}
            <div className="execution-action-bar">
              <label className="workflow-consent">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={e => setAuthorized(e.target.checked)}
                />
                <span>I am authorized to run this controlled local demonstration.</span>
              </label>

              <button
                type="button"
                className="refined-run-button"
                disabled={busy || !authorized}
                onClick={run}
              >
                {busy ? 'Running analysis…' : 'Run controlled scenario ↗'}
              </button>
            </div>

            {busy && (
              <p className="status-feedback" role="status">
                Awaiting actual backend execution. The signal is being captured by Hyperion.
              </p>
            )}
            {error && (
              <p className="error-feedback" role="alert">
                {error}
              </p>
            )}

            <div className="setup-footer-link">
              <Link className="editorial-link" href="/command-center/connect">
                Connect your authorized API ↗
              </Link>
            </div>
          </div>
        ) : (
          <div className="demonstration-view" data-run-id={result.run_id} data-stage={stage + 1} data-playback={playing ? 'playing' : 'paused'}>
            {/* Header: Verified Execution Result */}
            <header className="demonstration-header">
              <div className="header-meta">
                <span className="eyebrow demo-recorded-indicator">Recorded demo</span>
                <h2 className="execution-outcome">
                  {result.findings.length > 0 ? 'An unauthorized access was detected.' : result.detector_result}
                </h2>
                <p className="execution-sublead">
                  {result.request_count} persisted request{result.request_count > 1 ? 's' : ''} ·{' '}
                  {result.findings.length} generated finding{result.findings.length > 1 ? 's' : ''} · run{' '}
                  <code>{result.run_id.slice(0, 8)}</code>
                </p>
              </div>

              <button
                type="button"
                className="demo-exit-control"
                onClick={() => {
                  controller.stop()
                  setResult(null)
                  emittedStage.current = ''
                  window.dispatchEvent(new CustomEvent('hyperion-demo-reset', { detail: { reset: true } }))
                }}
              >
                Exit
              </button>
            </header>

            {/* Plain-Language Sequential Stage Timeline */}
            <nav className="stage-timeline-track" aria-label="Recorded stage timeline">
              {result.flow.stages.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`timeline-step-btn ${index === stage ? 'active' : ''}`}
                  aria-current={index === stage ? 'step' : undefined}
                  onClick={() => controller.goTo(index)}
                >
                  <span className="step-num">0{item.step}</span>
                  <span className="step-title">{item.name.replace('Incoming Edge Request', 'Request').replace('API Endpoint Resolution', 'Endpoint').replace('Traffic Log Persistence', 'Audit').replace('Security Engine Evaluation', 'Analysis').replace('Alert Creation & Classification', 'Finding').replace('Risk Intelligence Update', 'Risk').replace('Forensic Evidence Trace', 'Evidence')}</span>
                </button>
              ))}
            </nav>
            <DemoPlaybackControls stage={stage} stageCount={result.flow.stages.length} playing={playing} controller={controller}/>

            {/* Active Stage Presentation with Smooth Lateral Transition */}
            <SceneTransition transitionKey={stage} direction={direction}>
              <article className="demo-stage-detail active-stage-card" aria-label="Active stage presentation">
                <div className="stage-card-eyebrow">
                  <span className="stage-counter">
                    STAGE 0{stage + 1} OF 0{result.flow.stages.length}
                  </span>
                  <span className="stage-category-label">{currentNarrative.category}</span>
                </div>

                <h3 className="stage-headline">{currentNarrative.title}</h3>
                <p className="stage-explanation-text">{stage === 5 ? <RecordedRisk flow={result.flow} /> : currentNarrative.explanation}</p>

                {/* Stage Technical Telemetry */}
                <div className="stage-signals-ledger">
                  <span className="ledger-header">RECORDED TECHNICAL SIGNALS</span>
                  <div className="signals-grid">
                    {Object.entries(selected?.meta || {}).map(([key, value]) => (
                      <div key={key} className="signal-entry">
                        <span className="signal-key">{key}</span>
                        <span className="signal-value">
                          {typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value ?? 'Not available')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewarding Evidence Presentation on Stage 7 (or when finding verified) */}
                {stage === result.flow.stages.length - 1 && (
                  <section className="evidence-conclusive-card" aria-label="Verified evidence result">
                    <div className="evidence-card-header">
                      <span className="eyebrow">VERIFIED SECURITY EVIDENCE</span>
                      <h4 className="evidence-finding-title">
                        BOLA Finding #{alertId}
                      </h4>
                    </div>

                    <div className="evidence-summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Target Endpoint</span>
                        <span className="summary-data mono">
                          {result.selected_request.method} {result.selected_request.endpoint}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Observed Response</span>
                        <span className="summary-data mono spec-alert">
                          HTTP {result.selected_request.status_code} (Bypass)
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Detector</span>
                        <span className="summary-data">
                          {result.findings[0]?.alert_type?.toUpperCase() || 'BOLA'} Ownership Detector
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Severity</span>
                        <span className="summary-data badge-severity">
                          {result.findings[0]?.severity || 'CRITICAL'}
                        </span>
                      </div>
                      <div className="summary-item full-width">
                        <span className="summary-label">Risk Posture</span>
                        <span className="summary-data">
                          <RecordedRisk flow={result.flow} />
                        </span>
                      </div>
                    </div>

                    <div className="evidence-primary-actions">
                      <Link
                        className="prominent-evidence-link"
                        href={`/command-center/investigation?alert=${alertId}`}
                      >
                        Inspect the evidence →
                      </Link>

                      <Link
                        className="editorial-secondary-link"
                        href={`/command-center/investigation?event=${eventId}`}
                      >
                        Inspect real request evidence #{eventId} ↗
                      </Link>

                      <Link
                        className="editorial-secondary-link"
                        href={`/command-center/flow?event=${eventId}`}
                      >
                        Open full execution flow ↗
                      </Link>
                    </div>

                    {/* Expandable Technical Ledger IDs */}
                    <details className="forensic-details-drawer">
                      <summary>Technical Audit Trail & Identifiers</summary>
                      <div className="details-drawer-content">
                        <p>
                          <strong>Alert Record:</strong> #{alertId} in <code>security_alerts</code> table
                        </p>
                        <p>
                          <strong>Traffic Log:</strong> #{eventId} in <code>traffic_logs</code> table
                        </p>
                        <p>
                          <strong>Caller IP:</strong> {result.selected_request.caller_ip}
                        </p>
                        <p>
                          <strong>Cryptographic Trace:</strong> Unalterable SQLite ledger record
                        </p>
                      </div>
                    </details>
                  </section>
                )}

              </article>
            </SceneTransition>
          </div>
        )}
      </div>
    </section>
  )
}
