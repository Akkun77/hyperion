import { useEffect } from 'react'
import { Link } from '../router'
import { loopEmblemPath } from '../graphics/loop'
import './brand-introduction.css'

export default function BrandReveal({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onComplete() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onComplete])

  return (
    <div
      className="brand-reveal-overlay hyperion-opening"
      role="dialog"
      aria-modal="true"
      aria-label="Hyperion brand introduction"
    >
      <div className="brand-reveal-stage">
        <div className="reveal-svg-wrap">
          <svg viewBox="0 0 64 64" className="reveal-loop-svg" aria-hidden="true">
            <path d={loopEmblemPath(180)} className="loop-guide" />
            <path d={loopEmblemPath(180)} className="loop-trace" pathLength="100" />
          </svg>
        </div>

        <div className="reveal-brand-text">
          <span className="reveal-title">HYPERION</span>
          <span className="reveal-subtitle">API SECURITY SYSTEMS</span>
        </div>
        <div className="intro-actions"><Link href="/command-center" onClick={onComplete} autoFocus>Enter Command Center ↗</Link><button type="button" onClick={onComplete}>Explore homepage</button></div>
      </div>
    </div>
  )
}
