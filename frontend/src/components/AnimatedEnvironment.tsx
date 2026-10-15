import { useEffect, useRef, useState } from 'react'

export default function AnimatedEnvironment({ subdued, visualMode }: { subdued: boolean; visualMode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState('fallback')
  useEffect(() => {
    const canvas = canvasRef.current!
    let dispose: (() => void) | undefined
    let cancelled = false
    if (visualMode === 'light') { setMode('fallback'); return }
    import('../graphics/environment').then(({ createEnvironment }) => {
      if (cancelled) return
      try {
        dispose = createEnvironment(canvas, setMode, visualMode === 'still')
      } catch {
        setMode('fallback')
      }
    }).catch(() => setMode('fallback'))
    return () => { cancelled = true; dispose?.() }
  }, [visualMode])

  return <div className={`environment ${subdued ? 'environment-subdued' : ''}`} aria-hidden="true" data-renderer={mode}>
    <div className="environment-halo" />
    <div className={`fallback-sculpture ${mode === 'webgl' ? 'fallback-hidden' : ''}`}><i /><i /><i /></div>
    <canvas ref={canvasRef} className={mode === 'webgl' ? 'scene-visible' : ''} />
    <div className="environment-grain" />
  </div>
}
