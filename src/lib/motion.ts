import type { Variants } from 'framer-motion'

/**
 * FITGEAR motion language (Parte 8) — reusable Framer Motion variants + the
 * shared hover-lift utility, built ON the Part 1 motion tokens in
 * `src/index.css`. See `docs/design.md` → "Motion".
 *
 * Framer animates in JS and can't read CSS custom properties, so the token
 * VALUES are mirrored here as JS literals. Keep them in sync with
 * `--duration-*` / `--ease-out-athletic` in `src/index.css`.
 */

/** Seconds. Mirrors `--duration-fast` / `--duration-base` / `--duration-slow`. */
export const MOTION_DURATION = { fast: 0.18, base: 0.26, slow: 0.42 } as const

/** Mirrors `--ease-out-athletic`: cubic-bezier(0.22, 1, 0.36, 1). */
export const EASE_OUT_ATHLETIC: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * Section / routed-page entrance: fade up a short distance. Spread onto a
 * `motion.*` element: `<motion.section {...sectionEnter} />`.
 */
export const sectionEnter = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC },
} as const

/**
 * Staggered list. Put `staggerContainer` on the wrapper and `staggerItem` on
 * each child, both driven by `initial="hidden" animate="visible"`. This is the
 * mount-time stagger for Framer lists; for scroll-triggered reveal use
 * `useReveal`, and for grids that re-animate on filter/sort use `useStaggerIn`.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC },
  },
}

/**
 * Shared hover-lift for cards. CSS/Tailwind (not JS) so it's SSR-safe and the
 * lift is gated behind `motion-safe:` — no movement under reduced motion.
 * Tailwind's `transition` covers transform/color/shadow only (never layout
 * props), so it satisfies the "animate only transform/opacity" rule. We
 * deliberately do NOT set `will-change`: pinning cards to a permanent GPU layer
 * blurs product photos on scaled Windows displays (same reason `useStaggerIn`
 * clears its inline transforms).
 *
 * Usage: `className={`${hoverLift} hover:border-lime-400/30 hover:shadow-...`}`
 * — the lift + timing are shared; the hover color/shadow stay per-component.
 */
export const hoverLift =
  'transition duration-[var(--duration-base)] ease-out-athletic motion-safe:hover:-translate-y-1'
