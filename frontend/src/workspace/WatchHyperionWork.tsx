import { useEffect, useRef, useState } from 'react'
import { Link } from '../router'
import { DemoResult, productRequest } from './productApi'

const scenarios = [
  ['bola', 'BOLA'],
  ['normal', 'Normal request'],
  ['scraping', 'Scraping'],
  ['token', 'Token misuse'],
  ['shadow', 'Shadow discovery']
]

const BOLA_NARRATIVES: Record<number, { subtitle: string; lead: string; explanation: string }> = {
  1: {
    subtitle: 'SCENE 01 / 07 — REQUEST',
    lead: "A user attempts to access another user's resource.",
    explanation: 'Authenticated user user_101 transmits a GET request to /api/v1/users/{id} targeting record user_202.'
  },
  2: {
    subtitle: 'SCENE 02 / 07 — OBSERVATION',
    lead: 'Hyperion records the request and identifies the target API.',
    explanation: 'The request is resolved against the managed OpenAPI catalog under Identity & User Service and flagged for PII transmission.'
  },
  3: {
    subtitle: 'SCENE 03 / 07 — TRAFFIC AUDIT',
    lead: 'The transaction is permanently recorded in the audit store.',
    explanation: 'Hyperion logs the incoming request, caller IP, and HTTP status into SQLite for real-time analysis and compliance forensics.'
  },
  4: {
    subtitle: 'SCENE 04 / 07 — SECURITY ANALYSIS',
    lead: 'The response reveals an authorization failure.',
    explanation: "Token subject 'user_101' requested resource 'user_202'. The server returned status HTTP 200 instead of expected HTTP 403 Forbidden."
  },
  5: {
    subtitle: 'SCENE 05 / 07 — FINDING',
    lead: 'Hyperion identifies a broken object-level authorization vulnerability.',
    explanation: 'BOLA Ownership Detector triggers with CRITICAL severity. The authorization bypass is isolated and confirmed.'
  },
  6: {
    subtitle: 'SCENE 06 / 07 — RISK',
    lead: 'The endpoint risk reflects the security finding.',
    explanation: 'Risk score is dynamically recalculated to reflect an active exploit condition (+30 BOLA factor, +20 PII indicator).'
  },
  7: {
    subtitle: 'SCENE 07 / 07 — FORENSIC EVIDENCE',
    lead: 'The finding is linked to the originating request.',
    explanation: 'Forensic binding connects Alert to the exact persisted Traffic Event, providing an unalterable trail for investigation.'
  }
}

export default function WatchHyperionWork() {
  const [scenario, setScenario] = useState('bola')
  const [authorized, setAuthorized] = useState(false)
  const [result, setResult] = useState<DemoResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)
  const emittedStage = useRef('')

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
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.visualMotion === 'reduced'
    if (!playing || reduced || stage >= result.flow.stages.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStage(current => current + 1), 1100)
    return () => window.clearTimeout(timer)
  }, [result, stage, playing])

  // Keyboard navigation for stepping through stages
  useEffect(() => {
    if (!result) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && stage < result.flow.stages.length - 1) {
        setPlaying(false)
        setStage(s => s + 1)
      } else if (e.key === 'ArrowLeft' && stage > 0) {
        setPlaying(false)
        setStage(s => s - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [result, stage])

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setPlaying(false)
    window.dispatchEvent(new CustomEvent('hyperion-demo-stage', { detail: { stage: 1, active: true, tone: 1.0 } }))
    try {
      const response = await productRequest<DemoResult>('demo/run', undefined, { scenario, authorized })
      setStage(0)
      setResult(response)
      setPlaying(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Controlled execution unavailable.')
      window.dispatchEvent(new CustomEvent('hyperion-demo-reset', { detail: { reset: true } }))
    } finally {
      setBusy(false)
    }
  }

  const selected = result?.flow.stages[stage]
  const currentNarrative = BOLA_NARRATIVES[stage + 1] || {
    subtitle: `SCENE 0${stage + 1} / 0${result?.flow.stages.length || 7}`,
    lead: selected?.summary || '',
    explanation: selected?.name || ''
  }

  return (
    <section className="watch-experience" aria-label="Watch Hyperion work">
      <div className="watch-introduction">
        <span className="eyebrow">HYPERION / LIVING SECURITY CORE</span>
        <h1>Every API leaves a signal.</h1>
        <p className="watch-lead">See the request. Understand the risk. Follow the evidence.</p>
        <p>
          Send a controlled BOLA authorization failure through the actual FastAPI capture and security engine. Then explore
          its recorded seven-stage execution. Ambient loop motion alone is never live telemetry.
        </p>
        <Link className="text-link" href="/command-center/connect">
          Connect your authorized API ↗
        </Link>
      </div>

      <div className="scenario-controls">
        <div className="workflow-modes" aria-label="Controlled scenario">
          {scenarios.map(([value, label]) => (
            <button
              key={value}
              aria-pressed={scenario === value}
              disabled={busy}
              onClick={() => {
                setScenario(value)
                setResult(null)
                setPlaying(false)
                setError('')
                window.dispatchEvent(new CustomEvent('hyperion-demo-reset', { detail: { reset: true } }))
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {scenario === 'bola' ? (
          <div className="scenario-briefing-box">
            <span className="eyebrow">CONTROLLED BOLA SCENARIO BRIEFING</span>
            <p className="briefing-desc">
              Authenticated user <code>user_101</code> attempts to access account details belonging to{' '}
              <code>user_202</code> at <code>GET /api/v1/users/{'{id}'}</code>. In this deliberately vulnerable demo, the server
              returns HTTP 200 instead of HTTP 403 Forbidden, triggering Hyperion’s Broken Object-Level Authorization ownership detector.
            </p>
          </div>
        ) : (
          <p>
            Fixed local targets only. This appends{' '}
            {scenario === 'scraping' ? '16' : scenario === 'token' ? '3' : '1'} clearly controlled request
            {scenario === 'scraping' || scenario === 'token' ? 's' : ''}; historical data is retained.
          </p>
        )}

        <label className="workflow-consent">
          <input
            type="checkbox"
            checked={authorized}
            onChange={e => setAuthorized(e.target.checked)}
          />
          I am authorized to run this controlled local demonstration.
        </label>

        <button
          className="button primary"
          disabled={busy || !authorized}
          onClick={run}
        >
          {busy ? 'Executing real backend requests…' : 'Run controlled scenario ↗'}
        </button>

        {busy && <p role="status">Awaiting actual backend results. No execution stage is confirmed yet.</p>}
        {error && <p role="alert" className="error-text">{error}</p>}
      </div>

      {result && (
        <div className="confirmed-run workflow-reveal" data-run-id={result.run_id}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">COMPLETED CONTROLLED LOCAL EXECUTION</span>
              <h2>{result.detector_result}</h2>
              <p>
                {result.request_count} persisted requests · {result.findings.length} generated findings · run{' '}
                {result.run_id.slice(0, 8)}
              </p>
            </div>
            <button
              className="filter-reset replay-btn"
              onClick={() => {
                setStage(0)
                setPlaying(true)
              }}
              disabled={playing}
            >
              {playing ? 'Replaying stages…' : 'Replay recorded stages'}
            </button>
          </div>

          <p className="recorded-label">
            {result.presentation} Replay never sends additional requests.
          </p>

          {/* Stepper Navigation Track */}
          <nav className="scene-stepper-track" aria-label="Execution scenes">
            {result.flow.stages.map((item, index) => (
              <button
                key={item.id}
                className={`scene-pill ${index === stage ? 'active' : ''}`}
                aria-current={index === stage ? 'step' : undefined}
                onClick={() => {
                  setPlaying(false)
                  setStage(index)
                }}
              >
                <span className="pill-index">0{item.step}</span>
                <span className="pill-name">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Cinematic One-Scene-At-A-Time Active Scene */}
          {selected && (
            <section
              key={`${result.run_id}:${selected.id}`}
              className="demo-stage-detail workflow-reveal scene-card"
              aria-label="Active execution scene"
            >
              <div className="scene-meta-header">
                <span className="eyebrow">{currentNarrative.subtitle}</span>
                <span className="scene-counter">
                  Scene {stage + 1} of {result.flow.stages.length}
                </span>
              </div>

              <h2 className="scene-title">{currentNarrative.lead}</h2>
              <p className="scene-explanation">{currentNarrative.explanation}</p>

              {/* Scene Telemetry Grid */}
              <div className="scene-telemetry-box">
                <span className="telemetry-box-title">RECORDED STAGE TELEMETRY</span>
                <dl className="scene-specs-grid">
                  {Object.entries(selected.meta).map(([key, value]) => (
                    <div key={key} className="spec-cell">
                      <dt className="spec-label">{key}</dt>
                      <dd className="spec-value">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value ?? 'Not available')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* In Scene 07 (Evidence) or when finding exists: Verified Evidence Spotlight */}
              {stage === result.flow.stages.length - 1 && (
                <div className="scene-evidence-spotlight">
                  <div className="evidence-header">
                    <span className="eyebrow">VERIFIED FORENSIC EVIDENCE</span>
                    <h3>BOLA Finding #{result.flow.selected_alert_id || result.findings[0]?.alert_id || '1'}</h3>
                  </div>

                  <div className="evidence-specs-grid">
                    <div>
                      <span className="spec-label">Target Endpoint</span>
                      <span className="spec-val mono">
                        {result.selected_request.method} {result.selected_request.endpoint}
                      </span>
                    </div>
                    <div>
                      <span className="spec-label">Caller Identity</span>
                      <span className="spec-val mono">{result.selected_request.user_id || 'user_101'}</span>
                    </div>
                    <div>
                      <span className="spec-label">Target Resource</span>
                      <span className="spec-val mono spec-warning">
                        {result.selected_request.target_resource_id || 'user_202'}
                      </span>
                    </div>
                    <div>
                      <span className="spec-label">Observed HTTP Status</span>
                      <span className="spec-val mono spec-warning">
                        HTTP {result.selected_request.status_code} (Bypass)
                      </span>
                    </div>
                    <div>
                      <span className="spec-label">Detector</span>
                      <span className="spec-val">
                        {result.findings[0]?.alert_type?.toUpperCase() || 'BOLA'} Ownership Detector
                      </span>
                    </div>
                    <div>
                      <span className="spec-label">Severity</span>
                      <span className="spec-val badge-critical">
                        {result.findings[0]?.severity || 'CRITICAL'}
                      </span>
                    </div>
                  </div>

                  <div className="evidence-actions">
                    <Link
                      className="button primary evidence-cta"
                      href={`/command-center/investigation?alert=${result.flow.selected_alert_id || result.findings[0]?.alert_id || '1'}`}
                    >
                      Inspect real finding evidence in Investigation →
                    </Link>
                    <Link
                      className="text-link"
                      href={`/command-center/investigation?event=${result.selected_request.id}`}
                    >
                      Inspect real request evidence #{result.selected_request.id} ↗
                    </Link>
                    {result.flow.selected_alert_id && (
                      <Link
                        className="text-link"
                        href={`/command-center/investigation?alert=${result.flow.selected_alert_id}`}
                      >
                        Inspect generated finding ↗
                      </Link>
                    )}
                    <Link
                      className="text-link"
                      href={`/command-center/flow?event=${result.selected_request.id}`}
                    >
                      Open full execution flow ↗
                    </Link>
                  </div>
                </div>
              )}

              {/* Scene Navigation Footer Controls */}
              <div className="scene-navigation-footer">
                <button
                  className="scene-nav-btn prev-btn"
                  disabled={stage === 0}
                  onClick={() => {
                    setPlaying(false)
                    setStage(s => Math.max(0, s - 1))
                  }}
                >
                  ← Previous Scene
                </button>

                <span className="scene-indicator-pill">
                  {stage + 1} / {result.flow.stages.length}
                </span>

                {stage < result.flow.stages.length - 1 ? (
                  <button
                    className="scene-nav-btn next-btn primary"
                    onClick={() => {
                      setPlaying(false)
                      setStage(s => s + 1)
                    }}
                  >
                    Next Scene →
                  </button>
                ) : (
                  <button
                    className="scene-nav-btn replay-action-btn"
                    onClick={() => {
                      setStage(0)
                      setPlaying(true)
                    }}
                  >
                    Replay Walkthrough ↺
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  )
}
