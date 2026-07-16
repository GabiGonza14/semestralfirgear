import { WordMarquee } from './WordMarquee'

// Short motivating mantra instead of category names — a message, not a
// data-driven list, so it's a fixed word set rather than fetched.
const MESSAGE = ['ENTRENA', 'CRECE', 'SUPERA', 'REPITE']

// Seam between the gift finder and the CTA banner — same shared WordMarquee
// strip as the top category Marquee, so the two ribbons read as one family.
export function SolidSeam() {
  return <WordMarquee words={MESSAGE} />
}
