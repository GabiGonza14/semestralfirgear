import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'

// Verified-loading dramatic athletic shot (already used elsewhere in the app).
// Rendered in grayscale for an editorial, brand-forward look.
const HERO_IMAGE =
  'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1400'

export function Hero() {
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero="eyebrow"]', { y: 20, autoAlpha: 0, duration: 0.5 })
        .from(
          '[data-hero="line"]',
          { y: 44, autoAlpha: 0, duration: 0.7, stagger: 0.12 },
          '-=0.2',
        )
        .from('[data-hero="sub"]', { y: 18, autoAlpha: 0, duration: 0.5 }, '-=0.35')
        .from(
          '[data-hero="cta"] > *',
          { y: 16, autoAlpha: 0, duration: 0.4, stagger: 0.1 },
          '-=0.3',
        )
        .from(
          '[data-hero="photo"]',
          { autoAlpha: 0, yPercent: 4, scale: 1.05, duration: 0.9, ease: 'power2.out' },
          0.1,
        )
        .from('[data-hero="badge"]', { autoAlpha: 0, y: 14, duration: 0.5 }, '-=0.4')
        .from('[data-hero="watermark"]', { autoAlpha: 0, duration: 1.1 }, 0.15)
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-slate-950">
      {/* Oversized brand watermark */}
      <span
        data-hero="watermark"
        aria-hidden
        className="font-display pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none text-[22vw] font-black uppercase leading-none tracking-tighter text-white/[0.025] lg:text-[16vw]"
      >
        FITGEAR
      </span>

      {/* Drifting multi-hue glows — dynamic background */}
      <div className="fg-drift pointer-events-none absolute -left-40 top-10 h-[460px] w-[460px] rounded-full bg-lime-400/15 blur-[110px]" />
      <div className="fg-drift-slow pointer-events-none absolute -right-28 bottom-0 h-[420px] w-[420px] rounded-full bg-emerald-400/12 blur-[120px]" />
      <div className="fg-hue pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-16 lg:py-28">
        {/* Left — editorial copy */}
        <div className="max-w-xl">
          <span
            data-hero="eyebrow"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-lime-400"
          >
            <span className="h-px w-8 bg-lime-400/60" />
            El mejor equipo de la ciudad
          </span>

          <h1 className="font-display mt-6 text-6xl font-black uppercase leading-[0.85] tracking-tight text-white sm:text-7xl lg:text-[5.5rem]">
            <span data-hero="line" className="block">
              <span
                style={{
                  WebkitTextStroke: '1.6px rgba(226,232,240,0.9)',
                  color: 'transparent',
                }}
              >
                Dale
              </span>{' '}
              forma
            </span>
            <span data-hero="line" className="block">
              a tu <span className="text-lime-400">cuerpo</span>
            </span>
          </h1>

          <p data-hero="sub" className="mt-7 max-w-md text-base leading-relaxed text-slate-300 md:text-lg">
            Equipamiento fitness premium para fuerza, cardio y recuperacion.
            Construye tu mejor version con accesorios durables y envio rapido.
          </p>

          <div data-hero="cta" className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_36px_-6px_rgba(163,230,53,0.65)]"
            >
              Empieza ahora
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              to="/shop?category=Pesas"
              className="inline-flex rounded-full border border-white/15 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-lime-400/50 hover:bg-white/5"
            >
              Ver pesas
            </Link>
          </div>

          {/* Quick stats — editorial proof row */}
          <div className="mt-12 flex gap-10 border-t border-white/[0.08] pt-7">
            {[
              { value: '500+', label: 'Atletas activos' },
              { value: '24-48h', label: 'Envio express' },
              { value: '4.9', label: 'Valoracion media' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — framed athletic portrait */}
        <div data-hero="photo" className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50">
            <img
              src={HERO_IMAGE}
              alt="Atleta entrenando con equipamiento FITGEAR"
              className="h-full w-full object-cover contrast-[1.05] saturate-[1.1]"
              loading="eager"
            />
            {/* Light bottom blend only — keep the photo vivid + a dual-hue wash */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-tr from-lime-400/10 via-transparent to-cyan-400/10 mix-blend-overlay" />
          </div>

          {/* Floating badge */}
          <div
            data-hero="badge"
            className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-4 shadow-xl shadow-black/40 backdrop-blur"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-900">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-white">Rendimiento real</p>
              <p className="text-xs text-slate-400">Equipo probado por atletas</p>
            </div>
          </div>

          {/* Lime corner accent */}
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-tr-[2rem] border-r-2 border-t-2 border-lime-400/60" />
        </div>
      </div>
    </section>
  )
}
