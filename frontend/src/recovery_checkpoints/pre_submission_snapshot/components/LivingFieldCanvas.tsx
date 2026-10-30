import { useEffect, useRef, useState } from 'react'
import { LivingField, LivingFieldStats } from '../graphics/livingField'

export interface LivingFieldCanvasProps {
  progress?: number
  quality?: 'full' | 'light' | 'still'
  interactive?: boolean
  className?: string
  onStats?: (stats: LivingFieldStats) => void
  onReady?: () => void
}

export default function LivingFieldCanvas({
  progress = 0,
  quality = 'full',
  interactive = true,
  className = '',
  onStats,
  onReady,
}: LivingFieldCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<LivingField | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = new LivingField({
      host: containerRef.current,
      progress,
      quality,
      interactive,
      reducedMotion,
      onStats: stats => {
        onStats?.(stats)
      },
    })
    engineRef.current = engine
    onReady?.()

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      engine.setReducedMotion(e.matches)
    }
    media.addEventListener('change', handleMotionChange)

    return () => {
      media.removeEventListener('change', handleMotionChange)
      engine.dispose()
      engineRef.current = null
    }
  }, [mounted, quality, interactive])

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setProgress(progress, { animate: true })
    }
  }, [progress])

  return (
    <div
      ref={containerRef}
      className={`living-field-viewport ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    />
  )
}
