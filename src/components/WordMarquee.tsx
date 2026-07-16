import { FloatingShapes } from './FloatingShapes'

interface WordMarqueeProps {
  words: string[]
}

// Infinite-scroll strip: words alternate solid-white / lime-outline, with a
// diamond separator, over the drifting FloatingShapes field. Shared by
// Marquee.tsx (category names from the DB) and SolidSeam.tsx (a fixed
// message) — same format/color language, different word source. The track
// holds the sequence twice so the CSS translateX(-50%) loop is seamless.
// Hidden from assistive tech.
export function WordMarquee({ words }: WordMarqueeProps) {
  if (words.length === 0) {
    return null
  }

  const repeats = Math.max(1, Math.ceil(8 / words.length))
  const unit = Array.from({ length: repeats }, () => words).flat()
  const sequence = [...unit, ...unit]

  return (
    <div
      aria-hidden
      className="relative flex overflow-hidden border-y border-white/[0.06] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 py-6"
    >
      <FloatingShapes variant="marquee" />
      <div className="fg-marquee-track flex w-max shrink-0 items-center gap-10 pr-10">
        {sequence.map((word, index) => (
          <div key={`${word}-${index}`} className="flex items-center gap-10">
            <span
              className="font-display text-2xl font-black uppercase tracking-tight md:text-4xl"
              style={
                index % 2 === 0
                  ? { color: '#e2e8f0' }
                  : { WebkitTextStroke: '1.4px rgba(163,230,53,0.85)', color: 'transparent' }
              }
            >
              {word}
            </span>
            <span className="text-lime-400">
              <svg className="h-3.5 w-3.5 md:h-4 md:w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
