import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'

const AUTOPLAY_MS = 6000

interface Slide {
  id: string
  tag: string
  title: string
  accent: string
  subtitle: string
  image: string
  ctaTo: string
  ctaLabel: string
}

const slides: Slide[] = [
  {
    id: 'power',
    tag: 'Fuerza & Potencia',
    title: 'Eleva tu',
    accent: 'rendimiento',
    subtitle: 'Equipamiento premium para potencia, cardio y recuperacion con envio rapido.',
    image:
      'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1600',
    ctaTo: '/shop?category=Pesas',
    ctaLabel: 'Ver Pesas',
  },
  {
    id: 'focus',
    tag: 'Entrenamiento Total',
    title: 'Sube tu nivel',
    accent: 'cada serie',
    subtitle: 'Mancuernas y accesorios de fuerza para resultados visibles semana a semana.',
    image:
      'https://hips.hearstapps.com/hmg-prod/images/she-never-skips-a-gym-session-royalty-free-image-1688728456.jpg?crop=1xw:0.84335xh;0,0.0168xh',
    ctaTo: '/shop',
    ctaLabel: 'Explorar todo',
  },
  {
    id: 'recovery',
    tag: 'Cardio & Movilidad',
    title: 'Cardio inteligente,',
    accent: 'rendimiento total',
    subtitle: 'Siente la diferencia con accesorios ligeros, durables y listos para accion.',
    image:
      'https://blog.dema-argentina.com.ar/hs-fs/hubfs/rolo%20masajeador.jpg?width=940&height=486&name=rolo%20masajeador.jpg',
    ctaTo: '/shop?category=Colchonetas',
    ctaLabel: 'Ver Colchonetas',
  },
]

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(1)
  const [transitionEnabled, setTransitionEnabled] = useState(true)
  const textRef = useRef<HTMLDivElement>(null)

  const total = slides.length
  const extendedSlides = useMemo(() => [slides[total - 1], ...slides, slides[0]], [total])
  const currentSlide = slides[(activeIndex - 1 + total) % total]

  const handleTransitionEnd = () => {
    if (activeIndex === 0) {
      setTransitionEnabled(false)
      setActiveIndex(total)
      return
    }
    if (activeIndex === total + 1) {
      setTransitionEnabled(false)
      setActiveIndex(1)
    }
  }

  const goToNext = () => setActiveIndex((i) => i + 1)
  const goToPrev = () => setActiveIndex((i) => i - 1)

  useEffect(() => {
    const timer = window.setTimeout(goToNext, AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [activeIndex, transitionEnabled])

  useEffect(() => {
    if (!transitionEnabled) {
      const frame = window.requestAnimationFrame(() => setTransitionEnabled(true))
      return () => window.cancelAnimationFrame(frame)
    }
    return undefined
  }, [transitionEnabled, activeIndex])

  const translate = useMemo(() => `translateX(-${activeIndex * 100}%)`, [activeIndex])

  /* GSAP: re-animates text content on every slide change */
  useGSAP(
    () => {
      // Motion is an enhancement: skip it entirely when reduced motion is on so
      // the slide text simply stays at its natural, visible state.
      if (prefersReducedMotion()) return

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-tag', { y: 24, autoAlpha: 0, duration: 0.45 })
      tl.from('.hero-title', { y: 52, autoAlpha: 0, duration: 0.7 }, '-=0.25')
      tl.from(
        '.hero-sub',
        { y: 20, autoAlpha: 0, duration: 0.45, ease: 'power2.out' },
        '-=0.4',
      )
      tl.from(
        '.hero-cta > *',
        { y: 16, autoAlpha: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out' },
        '-=0.3',
      )
    },
    { scope: textRef, dependencies: [activeIndex], revertOnUpdate: true },
  )

  return (
    <section
      className="relative overflow-hidden bg-slate-950"
      style={{ minHeight: 'min(90vh, 700px)' }}
    >
      {/* Background image track */}
      <div className="absolute inset-0">
        <div
          className={`flex h-full ${transitionEnabled ? 'transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]' : ''}`}
          style={{ transform: translate }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedSlides.map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className="relative h-full min-w-full"
              aria-hidden={
                !((index - 1 + total) % (total + 2) === (activeIndex - 1 + total) % total)
              }
            >
              <img
                src={slide.image}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {/* Dark overlays */}
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
      </div>

      {/* Lime glow accent */}
      <div className="absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-lime-400/10 blur-[80px] pointer-events-none" />

      {/* Text content */}
      <div
        ref={textRef}
        className="relative z-10 flex h-full min-h-[min(90vh,700px)] items-center px-6 sm:px-10 lg:px-16"
      >
        <div className="max-w-2xl space-y-5 py-20">
          <span className="hero-tag inline-block rounded-full border border-lime-400/30 bg-lime-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-lime-400">
            {currentSlide.tag}
          </span>

          <h1 className="hero-title text-5xl font-black leading-[0.9] text-white sm:text-6xl md:text-7xl lg:text-8xl">
            {currentSlide.title}
            <br />
            <span className="text-lime-400">{currentSlide.accent}</span>
          </h1>

          <p className="hero-sub max-w-lg text-base text-slate-300 md:text-lg">
            {currentSlide.subtitle}
          </p>

          <div className="hero-cta flex flex-wrap gap-3 pt-2">
            <Link
              to={currentSlide.ctaTo}
              className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_28px_-4px_rgba(163,230,53,0.6)]"
            >
              {currentSlide.ctaLabel}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              to="/shop"
              className="inline-flex rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
            >
              Ver todo
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 sm:left-10 lg:left-16">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir al slide ${index + 1}`}
            onClick={() => setActiveIndex(index + 1)}
            className={`h-1 rounded-full transition-all duration-400 ${
              activeIndex === index + 1
                ? 'w-10 bg-lime-400'
                : 'w-4 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Arrow controls */}
      <button
        type="button"
        aria-label="Slide anterior"
        onClick={goToPrev}
        className="absolute right-16 bottom-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-lime-400/50 hover:bg-lime-400/10 hover:text-lime-400"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Siguiente slide"
        onClick={goToNext}
        className="absolute right-4 bottom-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-lime-400/50 hover:bg-lime-400/10 hover:text-lime-400"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Slide counter */}
      <div className="absolute bottom-6 right-4 z-10 mr-24 text-xs font-semibold text-slate-400">
        <span className="text-lime-400">{String(((activeIndex - 1 + total) % total) + 1).padStart(2, '0')}</span>
        <span className="mx-1.5 opacity-40">/</span>
        <span>{String(total).padStart(2, '0')}</span>
      </div>
    </section>
  )
}
