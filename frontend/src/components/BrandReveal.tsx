import { useCallback, useEffect, useRef, useState } from 'react'
import { loopEmblemPath } from '../graphics/loop'
import './brand-introduction.css'

const pathData = loopEmblemPath(180)

export default function BrandReveal({ onComplete }: { onComplete: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const completed = useRef(false)
  const [renderer, setRenderer] = useState('fallback')
  const [reducedMotion, setReducedMotion] = useState(false)
  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    onComplete()
  }, [onComplete])
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.visualMotion === 'reduced'
    setReducedMotion(reduced)
    // Normal completion comes from the 2.75s overlay animation; this is a fail-safe.
    const timer = window.setTimeout(finish, reduced ? 600 : 3500)
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') finish() }
    window.addEventListener('keydown', key)
    return () => {window.clearTimeout(timer);window.removeEventListener('keydown', key)}
  }, [finish])
  useEffect(() => {
    if (!canvas.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.visualMotion === 'reduced') return
    let cancelled = false, dispose: (() => void) | undefined
    import('../graphics/environment').then(({ createEnvironment }) => {
      if (cancelled) return
      try { dispose = createEnvironment(canvas.current!, setRenderer) } catch { setRenderer('fallback') }
    }).catch(() => setRenderer('fallback'))
    return () => {cancelled = true;dispose?.()}
  }, [])

  return (
    <div
      className={`brand-reveal-overlay hyperion-opening ${reducedMotion ? 'opening-reduced' : ''}`}
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'hyperion-opening-exit') finish()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hyperion brand introduction"
    >
      <div className="brand-reveal-stage">
        <div className="reveal-svg-wrap" data-renderer={renderer}>
          <canvas ref={canvas} className="intro-loop-canvas" aria-hidden="true" />
          <svg viewBox="0 0 64 64" className="reveal-loop-svg" aria-hidden="true">
            <path d={pathData} className="loop-guide" />
            <path d={pathData} className="loop-trace" pathLength="100" />
            <path d={pathData} className="loop-radiance" pathLength="100" />
          </svg>
        </div>

        <div className="reveal-brand-text">
          <span className="reveal-title">HYPERION</span>
          <span className="reveal-subtitle">API SECURITY SYSTEMS</span>
          <small className="intro-decoration-note">Brand introduction · not network loading</small>
        </div>
      </div>

      <button
        type="button"
        className="intro-skip"
        onClick={finish}
        autoFocus
        aria-label="Skip introduction"
      >
        Skip introduction ↗
      </button>
    </div>
  )
}
