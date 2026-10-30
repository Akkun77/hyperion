import React from 'react'

interface SceneTransitionProps {
  children: React.ReactNode
  transitionKey: string | number
  direction?: 'forward' | 'backward'
  className?: string
}

/**
 * Reusable Yuvrik-inspired cinematic scene transition component.
 * Outgoing content glides sideways, incoming content enters subtly scaled down
 * and expands into place as opacity increases, settling cleanly at transform: none.
 */
export default function SceneTransition({
  children,
  transitionKey,
  direction = 'forward',
  className = ''
}: SceneTransitionProps) {
  return (
    <div
      key={transitionKey}
      className={`scene-transition-surface scene-${direction} ${className}`}
      data-transition-key={transitionKey}
    >
      {children}
    </div>
  )
}
