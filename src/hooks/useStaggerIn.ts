import type { RefObject } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'

interface StaggerInOptions {
  /** Re-play the entrance whenever any of these change (filter/sort/page). */
  deps?: unknown[]
  /** Vertical offset (px) children rise from. */
  y?: number
  /** Tween duration in seconds. */
  duration?: number
  /** Seconds between each child entering. */
  stagger?: number
}

/**
 * Entrance stagger for a container's DIRECT CHILDREN, re-played whenever `deps`
 * change (e.g. category/sort/pagination) — this is NOT scroll-triggered.
 *
 * When to use which pattern (see docs/design.md → "Motion"):
 * - scroll-triggered reveal on first view → `useReveal`
 * - list/grid that re-animates on filter/sort → `useStaggerIn` (this hook)
 *
 * Honours `prefers-reduced-motion` (the GSAP checkpoint, `prefersReducedMotion()`)
 * and clears its inline transform/opacity once settled, so cards don't stay on a
 * GPU-composited layer — which otherwise blurs product photos on scaled Windows
 * displays.
 */
export function useStaggerIn(
  scope: RefObject<HTMLElement | null>,
  options: StaggerInOptions = {},
) {
  const { deps = [], y = 18, duration = 0.45, stagger = 0.05 } = options

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const root = scope.current
      if (!root) return
      const children = root.children
      if (children.length === 0) return

      gsap.from(children, {
        y,
        autoAlpha: 0,
        duration,
        ease: 'power2.out',
        stagger,
        overwrite: true,
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}
