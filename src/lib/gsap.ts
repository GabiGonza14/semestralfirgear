import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Single source of truth for GSAP. Plugins are registered exactly once here,
// app-wide. Importing this module for its side effect in the entry point
// (main.tsx) guarantees registration runs before any component animates, so no
// component should ever call gsap.registerPlugin itself.
gsap.registerPlugin(useGSAP, ScrollTrigger)

/** True when the OS/user requested minimised, non-essential motion. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, ScrollTrigger, useGSAP }
