import type { RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '../lib/gsap'

interface RevealOptions {
  /** Vertical offset (px) elements rise from. */
  y?: number
  /** Seconds between staggered elements entering together. */
  stagger?: number
  /** Tween duration in seconds. */
  duration?: number
  /** ScrollTrigger start position. */
  start?: string
}

/**
 * Robust scroll-reveal for every `[data-reveal]` element inside `scope`.
 *
 * Why this exists: the previous implementation used
 * `gsap.from(selector, { opacity: 0, scrollTrigger: { trigger: selector } })`.
 * That picks only the first matched node as the trigger and, because `from`
 * renders the hidden state immediately, lazy images shifting the layout could
 * leave the other elements frozen at partial/zero opacity (the washed-out
 * category cards).
 *
 * This version instead:
 * - queries targets scoped to the ref (never the whole document),
 * - uses `ScrollTrigger.batch` so elements already in view animate on load and
 *   visible elements group into a natural stagger,
 * - runs `once` so it never toggles back to hidden,
 * - honours `prefers-reduced-motion` by rendering content immediately,
 * - refreshes once layout settles so late image/font loads can't desync starts.
 */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  options: RevealOptions = {},
) {
  const { y = 28, stagger = 0.1, duration = 0.7, start = 'top 88%' } = options

  useGSAP(
    () => {
      const root = scope.current
      if (!root) return

      const targets = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll('[data-reveal]'),
      )
      if (targets.length === 0) return

      // Failsafe: content is always made visible. Animation is an enhancement.
      if (prefersReducedMotion()) {
        gsap.set(targets, { autoAlpha: 1, y: 0 })
        return
      }

      gsap.set(targets, { autoAlpha: 0, y })

      const triggers = ScrollTrigger.batch(targets, {
        start,
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration,
            ease: 'power3.out',
            stagger,
            overwrite: true,
          }),
      })

      // Lazy images / web fonts can change layout after first paint, which
      // moves trigger start points. Recompute so nothing stays stuck hidden.
      const refresh = () => ScrollTrigger.refresh()
      const raf = requestAnimationFrame(refresh)
      window.addEventListener('load', refresh)

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('load', refresh)
        triggers.forEach((trigger) => trigger.kill())
      }
    },
    { scope },
  )
}
