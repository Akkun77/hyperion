import { useEffect, useRef, useState } from 'react'
import Brand from '../../components/Brand'
import { Link } from '../../router'
import LivingFieldCanvas from '../../components/LivingFieldCanvas'
import './arrival.css'

const chapters = [
  {
    chapterId: '01',
    name: 'ARRIVAL',
    at: 0,
    title: <>HYPERION<br />The Anatomy of a Request.</>,
    body: 'See the system. Follow the evidence. An autonomous inspection architecture for observing API surface topologies, verifying runtime invariants and navigating cryptographic evidence.'
  },
  {
    chapterId: '02',
    name: 'INSPECTION',
    at: 0.5,
    title: <>A request enters.<br />The field responds.</>,
    body: 'Every inbound payload is tracked across service vectors. Gateway invariants enforce ALLOW, FLAG, or BLOCK with immediate causal traceability and zero opaque verdicts.'
  },
  {
    chapterId: '03',
    name: 'REVELATION',
    at: 1.0,
    title: <>From structure<br />to understanding.</>,
    body: 'Transition from global observed perimeter topology down to individual parameter-level forensic findings and verified audit records.'
  },
]

export default function ArrivalPage({ platform }: { platform: boolean }) {
  let cinematic = { current: null as HTMLElement | null }
  let progress = { current: 0 }
  let pointer = { current: { x: 0, y: 0, vx: 0, vy: 0 } }
  let lastPointer = { current: { x: 0, y: 0, time: 0 } }
  let chapter = 0
  let setChapter = (_: any) => {}
  let cursorPos = { x: -100, y: -100 }
  let setCursorPos = (_: any) => {}
  let cursorSpeed = 0
  let setCursorSpeed = (_: any) => {}
  let cursorLabel = 'INSPECT'
  let setCursorLabel = (_: any) => {}
  let mounted = false
  let setMounted = (_: any) => {}
  let isMobile = false
  let setIsMobile = (_: any) => {}
  let activeTab: 'observe' | 'decide' | 'trace' = 'observe'
  let setActiveTab = (_: any) => {}
  let quality: 'full' | 'light' | 'still' = 'full'
  let setQuality = (_: any) => {}
  let sceneProgress = 0
  let setSceneProgress = (_: any) => {}
  let stats = { fps: 60, particles: 18000, drawCalls: 3 }
  let setStats = (_: any) => {}
  let isDebug = false
  let setIsDebug = (_: any) => {}

  try {
    cinematic = useRef<HTMLElement>(null)
    progress = useRef(0)
    pointer = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
    lastPointer = useRef({ x: 0, y: 0, time: 0 })
    const [ch, sCh] = useState(0)
    chapter = ch; setChapter = sCh
    const [cp, sCp] = useState({ x: -100, y: -100 })
    cursorPos = cp; setCursorPos = sCp
    const [cs, sCs] = useState(0)
    cursorSpeed = cs; setCursorSpeed = sCs
    const [cl, sCl] = useState('INSPECT')
    cursorLabel = cl; setCursorLabel = sCl
    const [m, sM] = useState(false)
    mounted = m; setMounted = sM
    const [mob, sMob] = useState(false)
    isMobile = mob; setIsMobile = sMob
    const [at, sAt] = useState<'observe' | 'decide' | 'trace'>('observe')
    activeTab = at; setActiveTab = sAt
    const [q, sQ] = useState<'full' | 'light' | 'still'>('full')
    quality = q; setQuality = sQ
    const [sp, sSp] = useState(0)
    sceneProgress = sp; setSceneProgress = sSp
    const [st, sSt] = useState({ fps: 60, particles: 18000, drawCalls: 3 })
    stats = st; setStats = sSt
    const [deb, sDeb] = useState(false)
    isDebug = deb; setIsDebug = sDeb

    useEffect(() => {
      setMounted(true)
      const checkMob = () => setIsMobile(window.innerWidth <= 768)
      checkMob()
      window.addEventListener('resize', checkMob)

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.has('debug') || window.location.hash.includes('debug')) {
          setIsDebug(true)
        }
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
            setIsDebug((d: boolean) => !d)
          }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
          window.removeEventListener('resize', checkMob)
          window.removeEventListener('keydown', handleKeyDown)
        }
      }
      return () => window.removeEventListener('resize', checkMob)
    }, [])

    useEffect(() => {
      const element = cinematic.current
      if (!element) return

      let animationFrame = 0
      const onScroll = () => {
        cancelAnimationFrame(animationFrame)
        animationFrame = requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect()
          const total = rect.height - window.innerHeight
          if (total <= 0) return
          const raw = -rect.top / total
          const clamped = Math.max(0, Math.min(1, raw))
          progress.current = clamped
          setSceneProgress(clamped)
          document.documentElement.style.setProperty('--scene-progress', clamped.toFixed(4))

          let activeIndex = 0
          for (let i = chapters.length - 1; i >= 0; i--) {
            if (clamped >= chapters[i].at - 0.05) {
              activeIndex = i
              break
            }
          }
          setChapter(activeIndex)
        })
      }

      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      return () => {
        window.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(animationFrame)
      }
    }, [])
  } catch {
    // SSR / static render fallback safe
  }

  const jump = (target: number) => {
    const element = cinematic.current
    if (!element) return
    const total = element.getBoundingClientRect().height - window.innerHeight
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top + target * total,
      behavior: 'smooth'
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const now = performance.now()
    const dt = Math.max(1, now - lastPointer.current.time)
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    const vx = dx / dt
    const vy = dy / dt
    const speed = Math.min(4, Math.hypot(vx, vy))

    pointer.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
      vx,
      vy,
    }
    lastPointer.current = { x: e.clientX, y: e.clientY, time: now }

    setCursorPos({ x: e.clientX, y: e.clientY })
    setCursorSpeed(speed)
  }

  const current = chapters[chapter] || chapters[0]

  return (
    <div className="arrival-page" id="main">
      {/* Precision Velocity Cursor Follower */}
      {mounted && !isMobile && (
        <div
          className="velocity-cursor"
          style={{
            transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
            opacity: cursorPos.x < 0 ? 0 : 1,
          }}
          aria-hidden="true"
        >
          <div
            className="velocity-cursor-ring"
            style={{
              transform: `scale(${1 + cursorSpeed * 0.35})`,
              borderColor: cursorSpeed > 1.5 ? 'var(--pearl)' : 'var(--silver)',
            }}
          />
          {cursorLabel && (
            <span className="velocity-cursor-tag">
              {cursorLabel}
            </span>
          )}
        </div>
      )}

      {/* Authoritative Obsidian / Pearl Top Bar */}
      <header className="arrival-masthead">
        <div className="arrival-masthead-inner">
          <Brand compact />
          <nav className="arrival-nav" aria-label="Primary destinations">
            <Link href="/command-center" className="nav-link">The Observatory</Link>
            <Link href="/command-center/gateway" className="nav-link">Secure Gateway</Link>
            <Link href="/command-center/risk" className="nav-link">Risk Atlas</Link>
            <Link href="/command-center/investigation" className="nav-link">Investigation</Link>
          </nav>
          <div className="arrival-masthead-actions">
            <Link href="/command-center" className="btn-open-workspace">
              Open Workspace <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Living Field Sticky Cinematic Stage */}
        <section
          ref={cinematic as any}
          className="arrival-stage-container"
          aria-label="Living Field Interactive Environment"
        >
          <div
            className="arrival-stage"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              pointer.current = { x: 0, y: 0, vx: 0, vy: 0 }
              setCursorPos({ x: -100, y: -100 })
            }}
          >
            {/* Semantic poster fallback for accessible and SSR compatibility */}
            <picture className="sr-only" aria-hidden="true">
              <source media="(max-width: 700px)" srcSet="/hyperion-2/posters/inspection-mobile.png" />
              <img src="/hyperion-2/posters/inspection-desktop.png" alt="Inspection Horizon" />
            </picture>

            {/* Approved Living Field Engine */}
            {mounted && (
              <div className="arrival-live-art is-ready" aria-hidden="true">
                <LivingFieldCanvas
                  progress={sceneProgress}
                  quality={quality}
                  interactive={true}
                  onStats={s => setStats(s)}
                />
              </div>
            )}

            {/* Kinetic Typography and Editorial Statements */}
            <div className="arrival-hero-copy" aria-live="off">
              <div className="hero-status-pill mono">
                <span className="status-indicator-dot" />
                <span>SYSTEM STATE: SYNCHRONIZED</span>
                <span className="status-divider">·</span>
                <span>ENGINE: ACTIVE</span>
              </div>
              <span className="arrival-index mono">
                {String(chapter + 1).padStart(2, '0')} / 06{' '}
                <span>{current.name.toUpperCase()}</span>
              </span>
              <h1 id="arrival-title">{current.title}</h1>
              <p>{current.body}</p>
              <div className="arrival-actions">
                <Link
                  href="/command-center"
                  className="arrival-primary"
                  onMouseEnter={() => setCursorLabel('OBSERVATORY')}
                >
                  Enter Observatory <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/command-center/gateway"
                  className="arrival-secondary"
                  onMouseEnter={() => setCursorLabel('GATEWAY')}
                >
                  Inspect Gateway <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* Command Portal Overlay at Finale */}
            {chapter === 5 && (
              <aside className="arrival-command-portal" aria-label="Command Center entry">
                <span className="mono">INSPECTION COMPLETE / ENTER THE WORKSPACE</span>
                <strong>Evidence is the interface.</strong>
                <p>Choose an operational route to inspect. Live data streams from the local gateway API.</p>
                <div>
                  <Link href="/command-center/gateway">01 <b>Secure Gateway</b> →</Link>
                  <Link href="/command-center/risk">02 <b>Risk Intelligence</b> →</Link>
                  <Link href="/command-center/investigation">03 <b>Investigation Desk</b> →</Link>
                </div>
              </aside>
            )}

            {/* Interactive Timeline Scrub Deck & Living Field Controls */}
            <div className="arrival-engine-controls">
              <nav className="arrival-chapters" aria-label="Cinematic chapters">
                {chapters.map((item, index) => (
                  <button
                    type="button"
                    key={item.name}
                    aria-current={chapter === index ? 'step' : undefined}
                    onClick={() => jump(item.at)}
                    onMouseEnter={() => setCursorLabel(item.name.toUpperCase())}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>

              {isDebug && (
                <div className="living-field-hud-bar" role="region" aria-label="Development diagnostics">
                  <div className="hud-scrub-wrap">
                    <span className="hud-kicker mono">SCENE PROGRESS</span>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={Math.round(sceneProgress * 1000)}
                      aria-label="Transformation progress"
                      onChange={e => {
                        const val = Number(e.target.value) / 1000
                        jump(val)
                      }}
                    />
                    <span className="hud-value mono">{(sceneProgress * 100).toFixed(1)}%</span>
                  </div>

                  <div className="hud-quality-selector" role="group" aria-label="Quality modes">
                    {(['full', 'light', 'still'] as const).map(q => (
                      <button
                        key={q}
                        type="button"
                        className={`quality-btn ${quality === q ? 'active' : ''}`}
                        onClick={() => setQuality(q)}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="hud-stats-readout mono" role="status" aria-live="polite">
                    <span>{stats.particles.toLocaleString()} ELEMENTS</span>
                    <span>/</span>
                    <span>{stats.fps} FPS</span>
                    <span>/</span>
                    <span>{stats.drawCalls} DRAWS</span>
                  </div>
                </div>
              )}
            </div>

            <div className="arrival-hero-foot mono">
              <span>LIVING FIELD INTELLIGENCE / KINETIC TELEMETRY</span>
              <span>ILLUSTRATIVE SYSTEM VISUALIZATION</span>
            </div>
            <div className="arrival-scroll-meter" aria-hidden="true" />
          </div>
        </section>

        {/* Core Architectural Narrative: OBSERVE → DECIDE → INVESTIGATE */}
        <section className="arrival-flow-narrative" id="narrative" aria-labelledby="narrative-title">
          <div className="narrative-heading">
            <span className="narrative-eyebrow mono">THE INSPECTION METHODOLOGY</span>
            <h2 id="narrative-title">
              From continuous observation<br />to cryptographic certainty.
            </h2>
            <p className="narrative-lead">
              HYPERION unifies runtime network discovery with immediate causal policy enforcement. Decisions are never opaque verdicts—they are reproducible evidence chains.
            </p>
          </div>

          {/* Interactive Mode Bar */}
          <div className="narrative-nav-bar" role="tablist" aria-label="Inspection workflow progression">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'observe'}
              className={`narrative-tab-btn ${activeTab === 'observe' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('observe')}
              onMouseEnter={() => setCursorLabel('OBSERVE')}
            >
              <span className="tab-step-num mono">01</span>
              <div className="tab-text-wrap">
                <span className="tab-title">OBSERVE</span>
                <span className="tab-sub">Living Service Topology</span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'decide'}
              className={`narrative-tab-btn ${activeTab === 'decide' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('decide')}
              onMouseEnter={() => setCursorLabel('DECIDE')}
            >
              <span className="tab-step-num mono">02</span>
              <div className="tab-text-wrap">
                <span className="tab-title">DECIDE</span>
                <span className="tab-sub">Causal Gateway Policy</span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trace'}
              className={`narrative-tab-btn ${activeTab === 'trace' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('trace')}
              onMouseEnter={() => setCursorLabel('INVESTIGATE')}
            >
              <span className="tab-step-num mono">03</span>
              <div className="tab-text-wrap">
                <span className="tab-title">INVESTIGATE</span>
                <span className="tab-sub">Cryptographic Audit Chain</span>
              </div>
            </button>
          </div>

          {/* Dynamic Interactive Stage */}
          <div className="narrative-stage-container">
            {activeTab === 'observe' && (
              <div className="narrative-tab-panel panel-observe" role="tabpanel" aria-label="Observed System Topology">
                <div className="narrative-panel-intro">
                  <div className="panel-kicker mono">AUTONOMOUS TOPOLOGY MAPPING</div>
                  <h3>5 Service Domains Observed Across Perimeter</h3>
                  <p>Passive ingress sensors catalog active endpoints and compute real-time risk scores without altering payload delivery.</p>
                </div>

                <div className="mini-topology-grid">
                  {[
                    { id: 'srv-1', name: 'payments-service', endpoints: '3 Endpoints', latency: '14ms', risk: '12 / 100', status: 'SYNCHRONIZED', port: ':8001' },
                    { id: 'srv-2', name: 'auth-service', endpoints: '2 Endpoints', latency: '9ms', risk: '05 / 100', status: 'SYNCHRONIZED', port: ':8001' },
                    { id: 'srv-3', name: 'customer-service', endpoints: '4 Endpoints', latency: '18ms', risk: '24 / 100', status: 'SYNCHRONIZED', port: ':8001' },
                    { id: 'srv-4', name: 'analytics-service', endpoints: '2 Endpoints', latency: '22ms', risk: '08 / 100', status: 'SYNCHRONIZED', port: ':8001' },
                    { id: 'srv-5', name: 'inventory-service', endpoints: '3 Endpoints', latency: '11ms', risk: '15 / 100', status: 'SYNCHRONIZED', port: ':8001' },
                  ].map(s => (
                    <div key={s.id} className="mini-topo-node">
                      <div className="topo-node-header">
                        <span className="topo-node-name">{s.name}</span>
                        <span className="topo-node-port mono">{s.port}</span>
                      </div>
                      <div className="topo-node-meta">
                        <span>{s.endpoints}</span>
                        <span className="mono">{s.latency}</span>
                      </div>
                      <div className="topo-node-footer">
                        <span className="mono status-live">{s.status}</span>
                        <span className="topo-risk mono">RISK {s.risk}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="narrative-panel-cta">
                  <Link href="/command-center" className="narrative-cta-link">
                    Explore full topology in The Observatory <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'decide' && (
              <div className="narrative-tab-panel panel-decide" role="tabpanel" aria-label="Gateway Causal Decision Pipeline">
                <div className="narrative-panel-intro">
                  <div className="panel-kicker mono">CAUSAL ENFORCEMENT PIPELINE</div>
                  <h3>Strict Decoupling of Gateway Decision &amp; Upstream Status</h3>
                  <p>Inbound traffic is measured against security invariants. Decisions are explicit and verifiable before requests reach upstream targets.</p>
                </div>

                <div className="decision-causal-strip">
                  <div className="causal-step-box step-client">
                    <span className="step-tag mono">01 / INGRESS</span>
                    <strong>Client Request</strong>
                    <code className="mono">GET /api/v1/users/user_101</code>
                    <span className="mono text-muted">Caller: 127.0.0.1</span>
                  </div>

                  <div className="causal-step-arrow" aria-hidden="true">→</div>

                  <div className="causal-step-box step-gateway">
                    <span className="step-tag mono">02 / GATEWAY ENGINE</span>
                    <strong>Policy Evaluator</strong>
                    <div className="decision-badges-row">
                      <span className="badge-allow">ALLOW</span>
                      <span className="badge-flag">FLAG</span>
                      <span className="badge-block">BLOCK</span>
                    </div>
                    <span className="mono text-muted">Invariant: Tenant Isolation</span>
                  </div>

                  <div className="causal-step-arrow" aria-hidden="true">→</div>

                  <div className="causal-step-box step-upstream">
                    <span className="step-tag mono">03 / UPSTREAM WORKLOAD</span>
                    <strong>Protected API</strong>
                    <code className="mono">Port :8001 / 200 OK</code>
                    <span className="mono text-muted">Forwarded or Intercepted</span>
                  </div>

                  <div className="causal-step-arrow" aria-hidden="true">→</div>

                  <div className="causal-step-box step-evidence">
                    <span className="step-tag mono">04 / EVIDENCE RECORD</span>
                    <strong>Audit Binding</strong>
                    <code className="mono">SHA-256 #a8f09d…</code>
                    <span className="mono text-muted">Cryptographically Sealed</span>
                  </div>
                </div>

                <div className="narrative-panel-cta">
                  <Link href="/command-center/gateway" className="narrative-cta-link">
                    Launch live scenarios in Secure Gateway <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'trace' && (
              <div className="narrative-tab-panel panel-trace" role="tabpanel" aria-label="Cryptographic Evidence Verification">
                <div className="narrative-panel-intro">
                  <div className="panel-kicker mono">FORENSIC PROVENANCE</div>
                  <h3>Immutable Audit Chain with SHA-256 Fingerprinting</h3>
                  <p>Every flagged anomaly or intercepted burst is sealed with an evidence hash linking raw request parameters to invariant rule evaluation.</p>
                </div>

                <div className="evidence-card-display">
                  <div className="evidence-display-header">
                    <div className="evidence-finding-badge mono">FINDING #FIND-BOLA-8821</div>
                    <span className="badge-flag">FLAGGED BY TENANT_GUARD</span>
                    <span className="mono text-muted">Severity: HIGH</span>
                  </div>

                  <div className="evidence-display-body">
                    <div className="evidence-field">
                      <span className="field-label mono">EVIDENCE FINGERPRINT (SHA-256)</span>
                      <code className="field-value mono">7d4a5e38f91b682390a1bc3ef8d40134bc679a029314de8fca023912efc48201</code>
                    </div>

                    <div className="evidence-two-col">
                      <div className="evidence-field">
                        <span className="field-label mono">EVALUATED INVARIANT</span>
                        <span className="field-val-text">AUTHZ_TENANT_ISOLATION_RULE_4</span>
                      </div>
                      <div className="evidence-field">
                        <span className="field-label mono">CORRELATED REQUEST RECORD</span>
                        <span className="field-val-text mono">Request #104 · GET /api/v1/orders/ord_9901</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="narrative-panel-cta">
                  <Link href="/command-center/investigation" className="narrative-cta-link">
                    Open Forensic Investigation Desk <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Command Portal Invitation */}
        <section className="arrival-command" aria-labelledby="arrival-command-title">
          <div className="arrival-command-container">
            <span className="command-kicker mono">THE INSTRUMENT</span>
            <h2 id="arrival-command-title">Your system, in view.</h2>
            <p>
              Open the workspace to observe recorded telemetry and execute verifiable networking scenarios.
            </p>
            <div className="arrival-command-links">
              <Link href="/command-center" className="portal-btn portal-btn-primary">
                The Observatory <span aria-hidden="true">→</span>
              </Link>
              <Link href="/command-center/gateway" className="portal-btn portal-btn-secondary">
                Secure Gateway <span aria-hidden="true">→</span>
              </Link>
              <Link href="/command-center/risk" className="portal-btn portal-btn-secondary">
                Risk Intelligence <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="arrival-footer">
        <Brand compact />
        <span className="mono">{platform ? 'SYSTEM OVERVIEW' : 'HYPERION 2.0'}</span>
        <a href="#main" onMouseEnter={() => setCursorLabel('TOP')}>Back to top ↑</a>
      </footer>
    </div>
  )
}
