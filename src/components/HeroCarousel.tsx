import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { prefersReducedMotion } from '../lib/gsap'

export interface HeroCarouselSlide {
  id: string
  /** Background image URL — see `public/hero/README.md` to swap in the final photos. */
  image: string
  title: string
  subtitle?: string
  /** Category name — tapping the slide opens /shop?category=<category>. */
  category: string
}

const AUTOPLAY_MS = 6000

// Imagen de fondo por slide, acorde a su categoria (mismas fotos que el
// showcase de categorias, en resolucion hero). Sustituye por fotos propias en
// `public/hero/` cuando esten listas (ver README.md ahi).
const SLIDES: HeroCarouselSlide[] = [
  {
    id: 'slide-1',
    // Pesas
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1920&q=80',
    title: 'Pesas para tu mejor versión',
    subtitle: 'Mancuernas y barras de alto rendimiento para ganar fuerza real.',
    // Categoria destino del slide — ajusta el nombre si usas otra categoria.
    category: 'Pesas',
  },
  {
    id: 'slide-2',
    // Botellas
    image:
      'https://images.unsplash.com/photo-1764426445457-59169e244cce?auto=format&fit=crop&w=1920&q=80',
    title: 'Hidratación que no te frena',
    subtitle: 'Botellas deportivas para acompañarte en cada entrenamiento.',
    category: 'Botellas',
  },
  {
    id: 'slide-3',
    // Bandas
    image:
      'https://images.pexels.com/photos/863977/pexels-photo-863977.jpeg?auto=compress&cs=tinysrgb&w=1920',
    title: 'Resistencia que se adapta a ti',
    subtitle: 'Bandas elásticas para fuerza, movilidad y recuperación.',
    category: 'Bandas',
  },
]

export function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = SLIDES.length

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (isPaused || prefersReducedMotion()) return

    timerRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, AUTOPLAY_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, count])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destacados FITGEAR"
      className="relative w-full overflow-hidden bg-slate-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="relative h-[78vh] max-h-[820px] min-h-[480px] w-full sm:h-[80vh] lg:h-[88vh]">
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <Link
              key={slide.id}
              to="/shop"
              search={{ category: slide.category }}
              className="group relative block h-full w-full shrink-0"
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              aria-label={`Ver categoría ${slide.category}`}
            >
              <div
                className="absolute inset-0 bg-slate-900 bg-cover bg-center transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                style={{ backgroundImage: `url(${slide.image})` }}
              />
              {/* Dark wash so the title stays legible over any photo */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/10 to-transparent" />

              <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-20 sm:px-10 sm:pb-24 lg:px-16 lg:pb-28">
                <span className="mb-4 h-1 w-12 bg-lime-400" />
                {/* Display tier (Parte 1): fluid clamp 48→96px via text-display-lg.
                    Line-height + tracking come from the token — see src/index.css. */}
                <h2 className="font-display max-w-3xl text-display-lg font-black uppercase text-white">
                  {slide.title}
                </h2>
                {slide.subtitle && (
                  <p className="mt-4 max-w-xl text-base text-slate-200 sm:text-lg">{slide.subtitle}</p>
                )}
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lime-400 transition group-hover:gap-3">
                  Ver {slide.category}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={prev}
          aria-label="Slide anterior"
          className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/50 text-white backdrop-blur transition hover:border-lime-400/50 hover:bg-slate-950/80 sm:left-6"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Siguiente slide"
          className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/50 text-white backdrop-blur transition hover:border-lime-400/50 hover:bg-slate-950/80 sm:right-6"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-8 bg-lime-400' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
