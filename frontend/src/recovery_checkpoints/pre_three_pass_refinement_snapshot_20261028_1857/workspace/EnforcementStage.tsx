import { useEffect, useRef, useState } from 'react'
import { Link } from '../router'

export type Decision = 'ALLOW' | 'FLAG' | 'BLOCK' | null

export interface GatewayEventData {
  id: number
  timestamp: string
  method: string
  endpoint: string
  source: string | null
  status_code: number
  upstream_status_code: number | null
  gateway_decision: Decision
  decision_reason: string | null
  latency_ms: number | null
  request_id: string | null
  finding_ids: number[]
}

interface EnforcementStageProps {
  event: GatewayEventData | null
  triggerKey?: number
}

export default function EnforcementStage({ event, triggerKey = 0 }: EnforcementStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [animProgress, setAnimProgress] = useState(1) // 0 to 1
  const [isReplaying, setIsReplaying] = useState(false)

  const decision = event?.gateway_decision || 'ALLOW'
  const isAllow = decision === 'ALLOW'
  const isFlag = decision === 'FLAG'
  const isBlock = decision === 'BLOCK'

  // Authoritative Monochromatic & Semantic Tokens
  const accentColor = isAllow ? '#53CE9A' : isFlag ? '#E9B969' : '#EB7777'

  // Animate on new event or manual replay
  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setAnimProgress(1)
      setIsReplaying(false)
      return
    }

    setIsReplaying(true)
    setAnimProgress(0)

    const startTime = performance.now()
    const duration = 1400 // 1.4s smooth inspection trajectory

    let animId = 0

    const step = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1, elapsed / duration)
      setAnimProgress(p)

      if (p < 1) {
        animId = requestAnimationFrame(step)
      } else {
        setIsReplaying(false)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [event?.id, triggerKey])

  // Canvas architectural inspection renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0

    const render = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = rect.width
      const h = rect.height

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // Perspective Grid & Structural Depth
      const cy = h * 0.44
      const xIngress = w * 0.12
      const xAperture = w * 0.50
      const xUpstream = w * 0.88
      const yEvidence = h * 0.82

      // Background architectural coordinate lines
      ctx.strokeStyle = 'rgba(52, 56, 62, 0.45)'
      ctx.lineWidth = 1

      // Horizontal transit guides
      ctx.beginPath()
      ctx.setLineDash([4, 8])
      ctx.moveTo(w * 0.04, cy)
      ctx.lineTo(w * 0.96, cy)
      ctx.stroke()
      ctx.setLineDash([])

      // Vertical aperture centerline
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(52, 56, 62, 0.6)'
      ctx.moveTo(xAperture, h * 0.1)
      ctx.lineTo(xAperture, h * 0.9)
      ctx.stroke()

      // Vertical evidence conduit guide (Aperture -> Evidence Sink)
      ctx.beginPath()
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = isFlag ? 'rgba(233, 185, 105, 0.4)' : 'rgba(52, 56, 62, 0.3)'
      ctx.moveTo(xAperture, cy)
      ctx.lineTo(xAperture, yEvidence)
      ctx.stroke()
      ctx.setLineDash([])

      // Ingress Boundary Ring (Left Horizon)
      ctx.strokeStyle = animProgress > 0 ? '#BFC3C7' : 'rgba(191, 195, 199, 0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(xIngress, cy, 14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(21, 23, 27, 0.8)'
      ctx.fill()

      ctx.fillStyle = '#9DA3AB'
      ctx.font = '9px "Cascadia Code", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('INGRESS', xIngress, cy - 22)
      ctx.fillText('CLIENT', xIngress, cy + 28)

      // Upstream Target Node (Right Sanctuary)
      const upstreamLit = (isAllow || isFlag) && animProgress > 0.75
      ctx.strokeStyle = upstreamLit ? '#53CE9A' : isBlock ? 'rgba(235, 119, 119, 0.25)' : 'rgba(52, 56, 62, 0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(xUpstream, cy, 18, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = upstreamLit ? 'rgba(83, 206, 154, 0.12)' : 'rgba(21, 23, 27, 0.8)'
      ctx.fill()

      if (upstreamLit) {
        ctx.beginPath()
        ctx.arc(xUpstream, cy, 26, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(83, 206, 154, 0.3)'
        ctx.stroke()
      }

      ctx.fillStyle = upstreamLit ? '#53CE9A' : isBlock ? '#9DA3AB' : '#BFC3C7'
      ctx.fillText('UPSTREAM CORE', xUpstream, cy - 26)
      ctx.fillText(isBlock ? 'UNREACHED' : 'SERVICE PORT 8001', xUpstream, cy + 32)

      // Central Aperture Inspection Field
      const apertureEngaged = animProgress >= 0.4
      ctx.save()
      ctx.translate(xAperture, cy)

      // Outer reticle ring
      ctx.strokeStyle = apertureEngaged ? accentColor : 'rgba(191, 195, 199, 0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(0, 0, 36, 0, Math.PI * 2)
      ctx.stroke()

      // Inner reticle ring
      ctx.strokeStyle = apertureEngaged ? accentColor : 'rgba(52, 56, 62, 0.8)'
      ctx.beginPath()
      ctx.arc(0, 0, 24, 0, Math.PI * 2)
      ctx.stroke()

      // Aperture cross-hairs
      ctx.strokeStyle = 'rgba(191, 195, 199, 0.25)'
      ctx.beginPath()
      ctx.moveTo(-44, 0); ctx.lineTo(-30, 0)
      ctx.moveTo(30, 0); ctx.lineTo(44, 0)
      ctx.moveTo(0, -44); ctx.lineTo(0, -30)
      ctx.moveTo(0, 30); ctx.lineTo(0, 44)
      ctx.stroke()

      ctx.restore()

      ctx.fillStyle = apertureEngaged ? accentColor : '#9DA3AB'
      ctx.fillText('INSPECTION APERTURE', xAperture, cy - 48)
      ctx.fillText(decision || 'STANDBY', xAperture, cy + 54)

      // Dynamic Signal Ray Propagation
      const p = animProgress

      if (p > 0) {
        // Stage 1: Ingress -> Aperture (p: 0 -> 0.45)
        const t1 = Math.min(1, p / 0.45)
        const curX1 = xIngress + (xAperture - xIngress) * t1

        ctx.strokeStyle = 'rgba(244, 244, 241, 0.8)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(xIngress, cy)
        ctx.lineTo(curX1, cy)
        ctx.stroke()

        if (t1 < 1) {
          // Pulse head
          ctx.beginPath()
          ctx.arc(curX1, cy, 4, 0, Math.PI * 2)
          ctx.fillStyle = '#F4F4F1'
          ctx.fill()
        }

        // Stage 2: Aperture Response & Consequence (p: 0.45 -> 1.0)
        if (p >= 0.45) {
          const t2 = (p - 0.45) / 0.55

          if (isAllow) {
            // Unrestricted penetration to upstream
            const curX2 = xAperture + (xUpstream - xAperture) * t2
            ctx.strokeStyle = '#53CE9A'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(xAperture, cy)
            ctx.lineTo(curX2, cy)
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(curX2, cy, 4.5, 0, Math.PI * 2)
            ctx.fillStyle = '#53CE9A'
            ctx.fill()
          } else if (isBlock) {
            // Block shockwave & deflection ring at aperture
            const shockRadius = 36 + t2 * 50
            const shockAlpha = Math.max(0, 1 - t2)
            ctx.strokeStyle = `rgba(235, 119, 119, ${shockAlpha})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(xAperture, cy, shockRadius, -Math.PI * 0.5, Math.PI * 0.5)
            ctx.stroke()

            // Barrier cross
            ctx.strokeStyle = '#EB7777'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(xAperture - 12, cy - 18); ctx.lineTo(xAperture - 12, cy + 18)
            ctx.stroke()
          } else if (isFlag) {
            // Twin consequence: pass-through to upstream AND evidence branch downward
            const curX2 = xAperture + (xUpstream - xAperture) * t2
            const curY2 = cy + (yEvidence - cy) * t2

            // Forward ray
            ctx.strokeStyle = 'rgba(233, 185, 105, 0.85)'
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.moveTo(xAperture, cy)
            ctx.lineTo(curX2, cy)
            ctx.stroke()

            // Downward evidence filament
            ctx.strokeStyle = '#E9B969'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(xAperture, cy)
            ctx.lineTo(xAperture, curY2)
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(xAperture, curY2, 4.5, 0, Math.PI * 2)
            ctx.fillStyle = '#E9B969'
            ctx.fill()
          }
        }
      }

      // Evidence Sink Coordinate (Bottom Center)
      const evidenceActive = isFlag || isBlock || (event?.finding_ids && event.finding_ids.length > 0)
      ctx.strokeStyle = evidenceActive ? (isFlag ? '#E9B969' : '#EB7777') : 'rgba(52, 56, 62, 0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(xAperture, yEvidence, 12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(21, 23, 27, 0.9)'
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = evidenceActive ? '#F4F4F1' : '#9DA3AB'
      ctx.fillText('EVIDENCE LEDGER', xAperture, yEvidence + 24)

      ctx.restore()

      if (isReplaying) {
        animId = requestAnimationFrame(render)
      }
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [animProgress, accentColor, decision, isAllow, isBlock, isFlag, isReplaying, event])

  return (
    <section className="enforcement-theatre" aria-label="Aperture Request Journey Theatre">
      {/* Precision Instrument Header */}
      <header className="theatre-hud">
        <div className="theatre-identity">
          <div className="theatre-kicker mono">THE ANATOMY OF A REQUEST // LIVE ENFORCEMENT FIELD</div>
          <h2 className="theatre-subject">
            {event ? (
              <>
                <span className="subject-method mono">{event.method}</span>
                <span className="subject-endpoint mono">{event.endpoint}</span>
              </>
            ) : (
              'Awaiting Request Selection'
            )}
          </h2>
          <div className="theatre-telemetry-row mono">
            <span>Event ID: #{event?.id ?? '—'}</span>
            <span className="dot-divider">•</span>
            <span>Recorded: {event ? new Date(event.timestamp).toLocaleTimeString() : '—'}</span>
            <span className="dot-divider">•</span>
            <span>Caller IP: {event?.source ? '127.0.0.1' : 'Local Ingress'}</span>
          </div>
        </div>

        {/* Verdict Callout */}
        <div className="theatre-verdict-cluster">
          <div className={`verdict-plaque mono verdict-${decision?.toLowerCase() || 'allow'}`}>
            <span className="verdict-dot" />
            <span className="verdict-text">{decision || 'STANDBY'}</span>
          </div>
          <span className="verdict-caption mono">
            {isAllow
              ? 'Pervious to Protected Upstream'
              : isFlag
              ? 'Witness Detached & Logged'
              : 'Interception Barrier Engaged'}
          </span>
        </div>

        {/* Interaction Controls */}
        <div className="theatre-actions">
          <button
            type="button"
            className="theatre-replay-btn mono"
            onClick={() => {
              setAnimProgress(0)
              setIsReplaying(true)
            }}
            disabled={isReplaying || !event}
          >
            {isReplaying ? 'Tracing Signal…' : 'Replay Causal Flow ↺'}
          </button>
          {event && (
            <Link
              href={`/command-center/investigation?event=${event.id}`}
              className="theatre-investigate-link mono"
            >
              Investigate Event #{event.id} →
            </Link>
          )}
        </div>
      </header>

      {/* Panoramic Architectural Canvas */}
      <div className="theatre-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="theatre-canvas"
          aria-label={`Visual simulation showing ${decision} decision for ${event?.method || 'GET'} ${event?.endpoint || 'request'}`}
        />
      </div>

      {/* Ground Instrument Readout (Monolithic Architectural Strip) */}
      <div className="theatre-data-strip mono">
        <div className="strip-cell">
          <span className="cell-label">01 / INGRESS RESOLUTION</span>
          <strong className="cell-value">{event?.method || 'GET'} {event?.endpoint || '—'}</strong>
          <small className="cell-sub">Req ID: {event?.request_id ? event.request_id.slice(0, 10) + '…' : 'synthetic-req'}</small>
        </div>

        <div className="strip-cell">
          <span className="cell-label">02 / GATEWAY APERTURE</span>
          <strong className="cell-value" style={{ color: accentColor }}>HTTP {event?.status_code || 200} // {decision}</strong>
          <small className="cell-sub">{event?.decision_reason || 'Policy evaluation complete'}</small>
        </div>

        <div className="strip-cell">
          <span className="cell-label">03 / UPSTREAM SANCTUARY</span>
          <strong className="cell-value">{isBlock ? 'BLOCKED BEFORE UPSTREAM' : `HTTP ${event?.upstream_status_code || 200} OK`}</strong>
          <small className="cell-sub">{isBlock ? 'Zero Upstream Penetration' : `Latency: ${event?.latency_ms ?? 1.2}ms`}</small>
        </div>

        <div className="strip-cell">
          <span className="cell-label">04 / EVIDENCE ATTESTATION</span>
          <strong className="cell-value">{event?.finding_ids?.length ? `${event.finding_ids.length} Finding(s) Linked` : 'Clean Trace'}</strong>
          <small className="cell-sub">{event ? `Evidence Record #${event.id}` : 'Ledger synced'}</small>
        </div>
      </div>
    </section>
  )
}
