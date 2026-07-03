import { useEffect, useState } from 'react'
import { getCategories } from '../api/fitgearApi'

// Decorative infinite-scroll strip. It shows the category names from the DB.
// The track holds the word list twice so the CSS translateX(-50%) loop is
// seamless. Hidden from assistive tech.
export function Marquee() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let active = true

    void getCategories()
      .then((result) => {
        if (active) {
          setCategories(result.map((category) => category.name))
        }
      })
      .catch(() => {
        if (active) {
          setCategories([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Nothing to show until categories load (keeps the strip out of the way).
  if (categories.length === 0) {
    return null
  }

  // Repeat the categories so the strip is wide enough, then duplicate the whole
  // unit for the seamless -50% scroll loop.
  const repeats = Math.max(1, Math.ceil(8 / categories.length))
  const unit = Array.from({ length: repeats }, () => categories).flat()
  const sequence = [...unit, ...unit]

  return (
    <div
      aria-hidden
      className="relative flex overflow-hidden border-y border-white/[0.06] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 py-6"
    >
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
