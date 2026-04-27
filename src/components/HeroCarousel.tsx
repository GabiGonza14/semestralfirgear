import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const AUTOPLAY_MS = 5000

interface Slide {
  id: string
  title: string
  subtitle: string
  image: string
}

const slides: Slide[] = [
  {
    id: 'power',
    title: 'Aprovecha tu entreno al maximo',
    subtitle: 'Equipamiento premium para potencia, cardio y recuperacion con envio rapido.',
    image:
      'https://blog.dema-argentina.com.ar/hs-fs/hubfs/rolo%20masajeador.jpg?width=940&height=486&name=rolo%20masajeador.jpg',
  },
  {
    id: 'focus',
    title: 'Sube tu nivel en cada serie',
    subtitle: 'Mancuernas y accesorios de fuerza para resultados visibles semana a semana.',
    image:
      'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1600',
  },
  {
    id: 'routine',
    title: 'Cardio inteligente, rendimiento total',
    subtitle: 'Siente la diferencia con accesorios ligeros, durables y listos para accion.',
    image:
      'https://hips.hearstapps.com/hmg-prod/images/she-never-skips-a-gym-session-royalty-free-image-1688728456.jpg?crop=1xw:0.84335xh;0,0.0168xh',
  },
]

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(1)
  const [transitionEnabled, setTransitionEnabled] = useState(true)

  const total = slides.length
  const extendedSlides = useMemo(() => [slides[total - 1], ...slides, slides[0]], [total])

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

  const goToNextSlide = () => {
    setActiveIndex((current) => current + 1)
  }

  const goToPreviousSlide = () => {
    setActiveIndex((current) => current - 1)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      goToNextSlide()
    }, AUTOPLAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeIndex, transitionEnabled])

  useEffect(() => {
    if (!transitionEnabled) {
      const frame = window.requestAnimationFrame(() => {
        setTransitionEnabled(true)
      })

      return () => {
        window.cancelAnimationFrame(frame)
      }
    }

    return undefined
  }, [transitionEnabled, activeIndex])

  const translate = useMemo(() => `translateX(-${activeIndex * 100}%)`, [activeIndex])

  return (
    <section className="relative mx-0 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_48px_-30px_rgba(17,24,39,0.55)]">
      <div className="relative h-[440px] w-full md:h-[560px]">
        <div
          className={`flex h-full ${transitionEnabled ? 'transition-transform duration-700 ease-out' : ''}`}
          style={{ transform: translate }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedSlides.map((slide, index) => (
            <article key={`${slide.id}-${index}`} className="relative h-full min-w-full">
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/24 to-transparent" />
              <div className="absolute -right-16 top-8 h-[240px] w-[320px] rounded-[48%] bg-lime-400/20 blur-3xl" />
              <div className="absolute inset-0 flex items-center px-6 sm:px-10 md:px-14">
                <div className="max-w-xl space-y-4 rounded-2xl border border-white/50 bg-white/82 p-6 shadow-lg backdrop-blur-sm md:p-8">
                  <p className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lime-700">
                    FITGEAR Accessories
                  </p>
                  <h1 className="text-4xl font-black leading-[0.92] text-gray-900 md:text-6xl">
                    {slide.title}
                  </h1>
                  <p className="max-w-xl text-sm text-gray-700 md:text-lg">{slide.subtitle}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      to="/shop"
                      className="inline-flex rounded-full bg-lime-500 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-lime-400"
                    >
                      Explorar productos
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          aria-label="Slide anterior"
          onClick={goToPreviousSlide}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white/90 p-2 text-gray-700 transition hover:border-lime-300 hover:bg-lime-50"
        >
          <span aria-hidden>←</span>
        </button>
        <button
          type="button"
          aria-label="Siguiente slide"
          onClick={goToNextSlide}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white/90 p-2 text-gray-700 transition hover:border-lime-300 hover:bg-lime-50"
        >
          <span aria-hidden>→</span>
        </button>

        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir al slide ${index + 1}`}
              onClick={() => setActiveIndex(index + 1)}
              className={`h-2.5 rounded-full transition-all ${
                activeIndex === index + 1 ? 'w-8 bg-lime-500' : 'w-2.5 bg-gray-400 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
