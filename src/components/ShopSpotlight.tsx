import { useEffect, useRef, useSyncExternalStore } from 'react'
import { prefersReducedMotion } from '../lib/gsap'

// The hover/pointer capability doesn't change during a session, so a no-op
// subscribe is enough; useSyncExternalStore just gives us an SSR-safe read
// (server snapshot = disabled) without a setState-in-effect.
const noopSubscribe = () => () => {}
const isSpotlightCapable = () =>
  !prefersReducedMotion() && window.matchMedia('(hover: hover) and (pointer: fine)').matches

// Geometry matches SectionDecor's dot grid so the reactive dots line up with the
// static ones at the patch edge (radial-gradient dots sit at each 26px tile's
// centre, i.e. an offset of GRID/2).
const GRID = 26
const CELL_OFFSET = GRID / 2
const PATCH = 320 // px — small canvas that follows the cursor (cheap buffer)
const HALF = PATCH / 2
const REPULSE_R = 118 // px of cursor influence
const MAX_PUSH = 7 // px max outward displacement
const OCCLUDE_R = 118 // px where the static dots are fully hidden under the patch
const IDLE_MS = 180 // stillness before the green lights up
const BASE_ALPHA = 0.32
const DOT_R = 1.7
// slate-950 (the page background in the gaps where dots show) — the occluder
// paints this so it hides the static CSS dots seamlessly under the patch.
const BG = '2,6,23'
const LIME = '163,230,53'

/**
 * Interactive dot layer for the Shop catalog backdrop. Two behaviours over
 * SectionDecor's static lime dots:
 *
 * 1. Magnetic/repulse — dots within REPULSE_R of the cursor are pushed slightly
 *    outward (a few px), stronger the closer they are.
 * 2. Idle green — the bright lime tint is OFF while the pointer is moving and
 *    fades in only after it holds still for ~IDLE_MS, at the resting spot.
 *
 * Implemented as a small canvas patch that follows the cursor: it occludes the
 * static dots underneath (same bg colour, radial so it blends at the edge) and
 * redraws the reactive dots each frame while anything is animating, then stops.
 *
 * Enhancement-only: renders nothing (leaving SectionDecor's plain static dots)
 * on touch / coarse pointers and under prefers-reduced-motion.
 */
export function ShopSpotlight() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enabled = useSyncExternalStore(noopSubscribe, isSpotlightCapable, () => false)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = PATCH * dpr
    canvas.height = PATCH * dpr

    let cursor: { x: number; y: number } | null = null // viewport coords
    let lastMove = 0
    let green = 0
    let raf = 0
    let running = false

    const draw = () => {
      raf = 0
      const now = performance.now()

      if (!cursor) {
        green += (0 - green) * 0.4
        canvas.style.opacity = '0'
        if (green > 0.01) {
          raf = requestAnimationFrame(draw)
        } else {
          running = false
        }
        return
      }

      const rect = wrap.getBoundingClientRect()
      const cxc = cursor.x - rect.left // cursor in container coords
      const cyc = cursor.y - rect.top
      const originX = cxc - HALF // patch top-left in container coords
      const originY = cyc - HALF
      canvas.style.transform = `translate(${originX}px, ${originY}px)`
      canvas.style.opacity = '1'

      const idle = now - lastMove > IDLE_MS
      green += ((idle ? 1 : 0) - green) * (idle ? 0.09 : 0.6)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, PATCH, PATCH)

      // Occluder: hide the static CSS dots under the patch, blending out at the edge.
      const occ = ctx.createRadialGradient(HALF, HALF, 0, HALF, HALF, HALF)
      occ.addColorStop(0, `rgba(${BG},1)`)
      occ.addColorStop(OCCLUDE_R / HALF, `rgba(${BG},1)`)
      occ.addColorStop(1, `rgba(${BG},0)`)
      ctx.fillStyle = occ
      ctx.fillRect(0, 0, PATCH, PATCH)

      // Reactive dots on the same grid as the static ones.
      const firstX = (Math.floor((originX - CELL_OFFSET) / GRID) + 1) * GRID + CELL_OFFSET
      const firstY = (Math.floor((originY - CELL_OFFSET) / GRID) + 1) * GRID + CELL_OFFSET
      for (let gx = firstX; gx < originX + PATCH; gx += GRID) {
        for (let gy = firstY; gy < originY + PATCH; gy += GRID) {
          const lx = gx - originX
          const ly = gy - originY
          const dx = lx - HALF
          const dy = ly - HALF
          const dist = Math.hypot(dx, dy)
          if (dist > HALF) {
            continue
          }
          let px = lx
          let py = ly
          let alpha = BASE_ALPHA
          let r = DOT_R
          if (dist < REPULSE_R) {
            const t = 1 - dist / REPULSE_R
            const push = t * t * MAX_PUSH
            if (dist > 0.01) {
              px += (dx / dist) * push
              py += (dy / dist) * push
            }
            const glow = t * green // bright only when idle (green ramps up)
            alpha = BASE_ALPHA + glow * 0.62
            r = DOT_R + glow * 1.5
          }
          // Fade toward the patch edge so reactive dots blend into the static grid.
          alpha *= Math.min(1, (1 - dist / HALF) * 2.4)
          if (alpha <= 0.01) {
            continue
          }
          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${LIME},${alpha})`
          ctx.fill()
        }
      }

      const settled = idle && Math.abs(1 - green) < 0.01
      if (settled) {
        running = false
      } else {
        raf = requestAnimationFrame(draw)
      }
    }

    const wake = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(draw)
      }
    }

    const handleMove = (event: PointerEvent) => {
      cursor = { x: event.clientX, y: event.clientY }
      lastMove = performance.now()
      green = 0 // green off immediately while moving
      wake()
    }
    const handleLeave = () => {
      cursor = null
      wake()
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    document.addEventListener('pointerleave', handleLeave)
    window.addEventListener('blur', handleLeave)
    window.addEventListener('scroll', wake, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerleave', handleLeave)
      window.removeEventListener('blur', handleLeave)
      window.removeEventListener('scroll', wake)
      if (raf) {
        cancelAnimationFrame(raf)
      }
    }
  }, [enabled])

  // Not capable → nothing here; SectionDecor's static dots remain as the fallback.
  if (!enabled) {
    return null
  }

  return (
    <div ref={wrapRef} aria-hidden className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        style={{ width: PATCH, height: PATCH, transition: 'opacity 200ms ease' }}
      />
    </div>
  )
}
