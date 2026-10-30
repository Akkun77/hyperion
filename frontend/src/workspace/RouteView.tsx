import { ReactNode, useEffect, useState, useRef } from 'react'

const TAB_INDEX_MAP: Record<string, number> = {
  '': 0,
  'inventory': 1,
  'traffic': 2,
  'alerts': 3,
  'risk': 4,
  'flow': 5,
  'investigation': 6,
  'connect': 7
}

export default function RouteView({
  section,
  children
}: {
  section: string
  children: (section: string) => ReactNode
}) {
  const [shown, setShown] = useState(section)
  const [leaving, setLeaving] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const prevSectionRef = useRef(section)

  useEffect(() => {
    if (section === shown) {
      setLeaving(false)
      return
    }

    const prevIdx = TAB_INDEX_MAP[shown] ?? 0
    const nextIdx = TAB_INDEX_MAP[section] ?? 0
    const dir = nextIdx >= prevIdx ? 'forward' : 'backward'
    setDirection(dir)
    prevSectionRef.current = section

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.visualMotion === 'reduced'

    if (prefersReducedMotion) {
      setShown(section)
      setLeaving(false)
      return
    }

    setLeaving(true)
    const timer = window.setTimeout(() => {
      setShown(section)
      setLeaving(false)
    }, 140)

    return () => window.clearTimeout(timer)
  }, [section, shown])

  return (
    <div
      className={`route-stage ${leaving ? 'route-leaving' : ''} dir-${direction}`}
      aria-busy={leaving}
      data-direction={direction}
    >
      <div
        className={`route-content scene-enter-${direction}`}
        key={shown}
      >
        {children(shown)}
      </div>
    </div>
  )
}
