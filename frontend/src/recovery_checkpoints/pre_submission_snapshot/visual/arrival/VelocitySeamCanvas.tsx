import { useEffect, useRef } from 'react'

interface VelocitySeamCanvasProps {
  progress: React.MutableRefObject<number>
  pointer: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number }>
  chapter: number
  onReady?: () => void
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
}

export default function VelocitySeamCanvas({ progress, pointer, chapter, onReady }: VelocitySeamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    let lastTime = performance.now()

    // Elastic spring physics for seam deformation
    let deformX = 0
    let deformY = 0
    let deformVx = 0
    let deformVy = 0

    // Initialize ambient telemetry particles
    const particleColors = ['#75ddeb', '#d2f85a', '#ffffff', '#ffd08a']
    particlesRef.current = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: 0.0005 + Math.random() * 0.0012,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }))

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius: 0.45,
        alpha: 0.9,
      })
    }
    canvas.addEventListener('click', handleClick)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 64)
      void dt
      lastTime = time

      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      // Spring deformation physics
      const p = pointer.current
      const targetDeformX = (p.vx || 0) * 0.6 + p.x * 0.15
      const targetDeformY = (p.vy || 0) * 0.4 + p.y * 0.1

      const tension = 0.08
      const damping = 0.86
      const forceX = (targetDeformX - deformX) * tension
      const forceY = (targetDeformY - deformY) * tension

      deformVx = (deformVx + forceX) * damping
      deformVy = (deformVy + forceY) * damping
      deformX += deformVx
      deformY += deformVy

      const prog = progress.current || 0
      const centerX = width * (0.58 + deformX * 0.08)
      const centerY = height * (0.50 + deformY * 0.06)

      // 1. Perspective grid floor / throat lines
      ctx.save()
      const gridOpacity = Math.max(0.12, Math.min(0.35, 0.15 + prog * 0.2))
      ctx.strokeStyle = `rgba(117, 221, 235, ${gridOpacity})`
      ctx.lineWidth = 1

      // Radiating perspective lines converging toward central throat
      const rayCount = 18
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / (rayCount - 1) - 0.5) * Math.PI * 0.85
        const rayEndX = centerX + Math.sin(angle) * width * 0.8
        const rayEndY = centerY + Math.cos(angle) * height * 0.85

        ctx.beginPath()
        ctx.moveTo(centerX + deformX * 20, centerY + deformY * 15)
        ctx.lineTo(rayEndX, rayEndY)
        ctx.stroke()
      }

      // Horizontal depth calipers
      const caliperCount = 8
      for (let j = 1; j <= caliperCount; j++) {
        const factor = (j / caliperCount) ** 1.8
        const yPos = centerY + factor * height * 0.48
        const span = width * 0.35 * factor

        ctx.beginPath()
        ctx.moveTo(centerX - span + deformX * 10 * factor, yPos)
        ctx.lineTo(centerX + span + deformX * 10 * factor, yPos)
        ctx.strokeStyle = `rgba(117, 221, 235, ${0.08 + (1 - factor) * 0.2})`
        ctx.stroke()
      }
      ctx.restore()

      // 2. Architectural Baffles (Left and Right staggered graphite fins)
      const finCount = 10
      for (let i = 0; i < finCount; i++) {
        const finProgress = i / finCount
        const finY = height * (0.15 + finProgress * 0.72)
        const finHeight = height * 0.05

        // Left Fin
        const leftFinWidth = width * (0.16 + (i % 3) * 0.04)
        const leftFinX = centerX - width * 0.06 - leftFinWidth - (finProgress ** 1.2) * width * 0.1 + deformX * 18 * (1 - finProgress)
        const leftGrad = ctx.createLinearGradient(leftFinX, finY, leftFinX + leftFinWidth, finY)
        leftGrad.addColorStop(0, 'rgba(18, 26, 24, 0.85)')
        leftGrad.addColorStop(0.85, 'rgba(32, 45, 42, 0.95)')
        leftGrad.addColorStop(1, 'rgba(117, 221, 235, 0.35)')

        ctx.fillStyle = leftGrad
        ctx.beginPath()
        ctx.moveTo(leftFinX, finY)
        ctx.lineTo(leftFinX + leftFinWidth, finY + finHeight * 0.2)
        ctx.lineTo(leftFinX + leftFinWidth - 6, finY + finHeight)
        ctx.lineTo(leftFinX, finY + finHeight)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(117, 221, 235, 0.22)'
        ctx.stroke()

        // Right Fin
        const rightFinWidth = width * (0.18 + ((i + 1) % 3) * 0.04)
        const rightFinX = centerX + width * 0.06 + (finProgress ** 1.2) * width * 0.1 + deformX * 18 * (1 - finProgress)
        const rightGrad = ctx.createLinearGradient(rightFinX, finY, rightFinX + rightFinWidth, finY)
        rightGrad.addColorStop(0, 'rgba(117, 221, 235, 0.35)')
        rightGrad.addColorStop(0.15, 'rgba(32, 45, 42, 0.95)')
        rightGrad.addColorStop(1, 'rgba(18, 26, 24, 0.85)')

        ctx.fillStyle = rightGrad
        ctx.beginPath()
        ctx.moveTo(rightFinX + 6, finY + finHeight * 0.2)
        ctx.lineTo(rightFinX + rightFinWidth, finY)
        ctx.lineTo(rightFinX + rightFinWidth, finY + finHeight)
        ctx.lineTo(rightFinX, finY + finHeight)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(117, 221, 235, 0.22)'
        ctx.stroke()
      }

      // 3. Central Inspection Seam (The razor-sharp decision conduit)
      ctx.save()
      const seamCurveX = centerX + deformX * 36
      const seamTopY = height * 0.08
      const seamBottomY = height * 0.92

      // Outer glow for the seam
      const seamGlow = ctx.createLinearGradient(seamCurveX - 25, 0, seamCurveX + 25, 0)
      seamGlow.addColorStop(0, 'rgba(210, 248, 90, 0)')
      seamGlow.addColorStop(0.5, 'rgba(210, 248, 90, 0.18)')
      seamGlow.addColorStop(1, 'rgba(210, 248, 90, 0)')
      ctx.fillStyle = seamGlow
      ctx.fillRect(seamCurveX - 25, seamTopY, 50, seamBottomY - seamTopY)

      // Main core seam line
      ctx.beginPath()
      ctx.moveTo(centerX, seamTopY)
      ctx.quadraticCurveTo(seamCurveX, centerY, centerX, seamBottomY)
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#d2f85a'
      ctx.shadowColor = '#d2f85a'
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.restore()

      // 4. Tripartite Decision Conduits (Allow = Emerald, Flag = Amber, Block = Ruby)
      if (prog > 0.32 || chapter >= 2) {
        ctx.save()
        const branchProgress = Math.min(1, Math.max(0, (prog - 0.32) / 0.25))

        // ALLOW Conduit (Left deflection)
        ctx.beginPath()
        ctx.moveTo(seamCurveX, centerY)
        ctx.quadraticCurveTo(seamCurveX - width * 0.14 * branchProgress, centerY + height * 0.15, seamCurveX - width * 0.18 * branchProgress, seamBottomY)
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 10
        ctx.stroke()

        // FLAG Conduit (Center continued)
        ctx.beginPath()
        ctx.moveTo(seamCurveX, centerY)
        ctx.lineTo(seamCurveX, seamBottomY)
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)'
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 10
        ctx.stroke()

        // BLOCK Conduit (Right severed with spark barrier)
        ctx.beginPath()
        ctx.moveTo(seamCurveX, centerY)
        ctx.quadraticCurveTo(seamCurveX + width * 0.12 * branchProgress, centerY + height * 0.1, seamCurveX + width * 0.15 * branchProgress, centerY + height * 0.22)
        ctx.lineWidth = 2.5
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 12
        ctx.stroke()

        // Block barrier cross
        const blockEnd = { x: seamCurveX + width * 0.15 * branchProgress, y: centerY + height * 0.22 }
        ctx.beginPath()
        ctx.arc(blockEnd.x, blockEnd.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#ef4444'
        ctx.fill()
        ctx.restore()
      }

      // 5. Ambient telemetry particles streaming through the seam
      ctx.save()
      particlesRef.current.forEach(pt => {
        if (!prefersReducedMotion) {
          pt.y += pt.vy * (1 + Math.abs(deformY) * 2)
          pt.x += pt.vx + deformX * 0.0003
          if (pt.y > 1) { pt.y = 0; pt.x = 0.35 + Math.random() * 0.3 }
          if (pt.x < 0 || pt.x > 1) { pt.x = 0.5 }
        }

        const px = pt.x * width + deformX * 25
        const py = pt.y * height
        ctx.beginPath()
        ctx.arc(px, py, pt.size, 0, Math.PI * 2)
        ctx.fillStyle = pt.color
        ctx.globalAlpha = pt.alpha
        ctx.fill()
      })
      ctx.restore()

      // 6. Interactive click ripples
      if (ripplesRef.current.length > 0) {
        ctx.save()
        ripplesRef.current = ripplesRef.current.filter(r => r.alpha > 0.01)
        ripplesRef.current.forEach(r => {
          r.radius += (r.maxRadius - r.radius) * 0.06
          r.alpha *= 0.94

          const rx = r.x * width
          const ry = r.y * height
          const rad = r.radius * width

          ctx.beginPath()
          ctx.arc(rx, ry, rad, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(210, 248, 90, ${r.alpha})`
          ctx.lineWidth = 2
          ctx.shadowColor = '#d2f85a'
          ctx.shadowBlur = 8
          ctx.stroke()
        })
        ctx.restore()
      }

      // 7. Tactical HUD caliper overlays (only on larger displays to prevent mobile text overlap)
      if (width > 680) {
        ctx.save()
        ctx.fillStyle = 'rgba(117, 221, 235, 0.65)'
        ctx.font = '10px "Cascadia Code", Consolas, monospace'
        ctx.fillText(`SEAM_FLUX: ${(98.4 + deformX * 3).toFixed(1)}%`, centerX - 80, height * 0.08)
        ctx.fillText(`GATE_STATE: ${chapter >= 3 ? 'TRI_SPLIT_ACTIVE' : 'ARMED'}`, centerX + 20, height * 0.08)
        ctx.fillText(`VELOCITY_X: ${((p.vx || 0) * 100).toFixed(1)} px/s`, width * 0.05, height * 0.90)
        ctx.fillText(`PHASE: CH_${String(chapter + 1).padStart(2, '0')}`, width * 0.05, height * 0.92)
        ctx.restore()
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render)
      }
    }

    animId = requestAnimationFrame(render)
    onReady?.()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('click', handleClick)
    }
  }, [chapter, onReady, pointer, progress])

  return (
    <canvas
      ref={canvasRef}
      className="arrival-velocity-canvas"
      aria-label="Interactive velocity-responsive enforcement seam"
    />
  )
}
