import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/gsap'

const SPOTLIGHT_RADIUS = '220px'

// Bright dot layer masked to a soft circle that follows the pointer, so the
// dot texture "lights up" near the cursor instead of sitting static. Layered
// on top of a SectionDecor dots layer, which stays visible everywhere else.
//
// Hidden on touch/coarse pointers and prefers-reduced-motion via the
// `.cursor-spotlight` CSS rule in index.css (no cursor to follow there, and a
// stale centered circle would just look broken) — kept in CSS rather than a
// React state toggle so there's no client-only render branch to desync from
// SSR. The effect below still skips attaching the listener in those cases,
// so no work happens under the hood either. Position updates are throttled
// to one per animation frame via rAF, same pattern as ShopPage's other
// pointer-driven work.
export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || prefersReducedMotion()) {
      return
    }

    let frame: number | null = null
    const handlePointerMove = (event: PointerEvent) => {
      if (frame !== null) {
        return
      }
      frame = requestAnimationFrame(() => {
        const rect = ref.current?.getBoundingClientRect()
        if (rect && ref.current) {
          ref.current.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
          ref.current.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
        }
        frame = null
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="cursor-spotlight pointer-events-none absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(163,230,53,0.9) 2px, transparent 2px)',
        backgroundSize: '26px 26px',
        maskImage: `radial-gradient(circle ${SPOTLIGHT_RADIUS} at var(--spotlight-x, 50%) var(--spotlight-y, 50%), black, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle ${SPOTLIGHT_RADIUS} at var(--spotlight-x, 50%) var(--spotlight-y, 50%), black, transparent 100%)`,
      }}
    />
  )
}
