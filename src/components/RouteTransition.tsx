import { type ReactNode, useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_ATHLETIC, MOTION_DURATION } from '../lib/motion'

interface RouteTransitionProps {
  /** Usually the route pathname — changing it replays the entrance. */
  routeKey: string
  children: ReactNode
  /** Passed straight to the underlying motion.div — e.g. `h-full` so a page
   *  that needs to fill its parent's height (like the admin shell) isn't
   *  broken by this wrapper defaulting to a plain, content-sized block. */
  className?: string
}

// Hydration-safe "are we past the first client paint?" flag. `useSyncExternalStore`
// returns the SERVER snapshot (false) for the SSR + initial hydration render, then
// the client snapshot (true) after — the React-idiomatic way to detect hydration
// without a setState-in-effect. Stable module-level fns so it never re-subscribes.
const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

/**
 * Coherent enter transition for routed page content (Parte 8).
 *
 * SSR/hydration-safe by design: on the server and the first client paint it
 * renders children at their FINAL state (`initial={false}`), so the streamed
 * HTML is never hidden and there is no hydration mismatch. Only AFTER hydration
 * — i.e. on real client navigations, when `routeKey` changes — does the entrance
 * play. This component itself is NOT keyed by the route (only its inner
 * `motion.div` is), so the hydrated flag survives navigation.
 *
 * Enter-only on purpose: TanStack Router unmounts the outgoing route on
 * navigation, so an exit animation can't be held reliably — we don't attempt
 * one. Reduced motion is handled centrally by `<MotionConfig reducedMotion="user">`
 * (see app/routes/_site.tsx); we also skip the entrance entirely here.
 */
export function RouteTransition({ routeKey, children, className }: Readonly<RouteTransitionProps>) {
  const hydrated = useHydrated()
  const reduceMotion = useReducedMotion()
  const animate = hydrated && !reduceMotion

  return (
    <motion.div
      key={routeKey}
      className={className}
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC }}
    >
      {children}
    </motion.div>
  )
}
