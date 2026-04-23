import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

interface Slide {
  id: string
  title: string
  subtitle: string
  image: string
}

const slides: Slide[] = [
  {
    id: 'power',
    title: 'Tu rutina, tu equipamiento',
    subtitle: 'Masajeador muscular para recuperacion y alivio de tensiones despues de entrenar.',
    image:
      'https://blog.dema-argentina.com.ar/hs-fs/hubfs/rolo%20masajeador.jpg?width=940&height=486&name=rolo%20masajeador.jpg',
  },
  {
    id: 'focus',
    title: 'Entrena mas fuerte',
    subtitle: 'Mancuernas para elevar tu rendimiento en cada sesion.',
    image:
      'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1600',
  },
  {
    id: 'routine',
    title: 'Tu rutina, tu equipamiento',
    subtitle: 'Cuerda para saltar para cardio, resistencia y agilidad en cada salto.',
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => current + 1)
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [total])

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
    <section className="relative mx-0 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="relative h-140 w-full md:h-160">
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
              <div className="absolute inset-0 bg-linear-to-r from-white/85 via-white/55 to-white/30" />
              <div className="absolute inset-0 flex items-center px-6 sm:px-10 md:px-14">
                <div className="max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
                  <p className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                    FITGEAR Accessories
                  </p>
                  <h1 className="text-4xl font-black leading-tight text-gray-900 md:text-6xl">
                    {slide.title}
                  </h1>
                  <p className="text-sm text-gray-700 md:text-lg">{slide.subtitle}</p>
                  <Link
                    to="/shop"
                    className="inline-flex rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Explorar productos
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          aria-label="Slide anterior"
          onClick={() => setActiveIndex((current) => current - 1)}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white/90 p-2 text-gray-700 transition hover:bg-white"
        >
          <span aria-hidden>←</span>
        </button>
        <button
          type="button"
          aria-label="Siguiente slide"
          onClick={() => setActiveIndex((current) => current + 1)}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white/90 p-2 text-gray-700 transition hover:bg-white"
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
                activeIndex === index + 1 ? 'w-8 bg-red-500' : 'w-2.5 bg-gray-400 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
