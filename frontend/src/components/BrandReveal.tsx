import { useEffect } from 'react'
import { loopEmblemPath } from '../graphics/loop'

const pathData = loopEmblemPath(180)

export default function BrandReveal({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.visualMotion === 'reduced'
    ) {
      onComplete()
      return
    }

    const timer = window.setTimeout(onComplete, 2600)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className="brand-reveal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hyperion brand introduction"
    >
      <div className="brand-reveal-stage">
        <div className="reveal-svg-wrap">
          <svg viewBox="0 0 64 64" className="reveal-loop-svg" aria-hidden="true">
            <path d={pathData} className="loop-guide" />
            <path d={pathData} className="loop-trace" pathLength="100" />
            <path d={pathData} className="loop-radiance" pathLength="100" />
          </svg>
        </div>

        <div className="reveal-brand-text">
          <span className="reveal-title">HYPERION</span>
          <span className="reveal-subtitle">API SECURITY SYSTEMS</span>
        </div>
      </div>

      <button
        type="button"
        className="intro-skip"
        onClick={onComplete}
        aria-label="Skip introduction"
      >
        Skip introduction ↗
      </button>
    </div>
  )
}
