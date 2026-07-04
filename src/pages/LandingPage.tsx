import { useRef, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { CategoryShowcase } from '../components/CategoryShowcase'
import { GiftFinder } from '../components/GiftFinder'
import { HeroCarousel } from '../components/HeroCarousel'
import { Marquee } from '../components/Marquee'
import { SectionDecor } from '../components/SectionDecor'
import { useCart } from '../context/CartContext'
import { useReveal } from '../hooks/useReveal'

interface TrustItem {
  label: string
  icon: ReactElement
}

const iconClass = 'h-5 w-5'

const trustItems: TrustItem[] = [
  {
    label: 'Envio rapido',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Compra segura',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Devoluciones faciles',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9a8 8 0 0 1 14-3M20 6v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 15a8 8 0 0 1-14 3M4 18v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Pago con Stripe',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { openCart } = useCart()
  useReveal(rootRef)

  return (
    <div ref={rootRef} className="bg-slate-950">
      {/* Hero — full bleed image carousel */}
      <HeroCarousel />

      {/* Dynamic marquee divider */}
      <Marquee />

      {/* Featured categories — big image + related products, alternating layout */}
      <CategoryShowcase />

      {/* Gift finder — browse by budget tier, below the featured section */}
      <GiftFinder />

      {/* CTA banner */}
      <section className="relative overflow-hidden">
        <SectionDecor pattern="grid" glowA="bg-violet-500/10" glowB="bg-cyan-500/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[2rem] border border-lime-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-6 py-14 text-center sm:px-12"
        >
          {/* Lime glow accents */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lime-400/10 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-lime-400/10 blur-[90px]" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
              FITGEAR Store
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Todo para tu entrenamiento,
              <br />
              <span className="text-lime-400">en un solo lugar</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-slate-400">
              Mancuernas, accesorios de cardio y herramientas de movilidad con compra
              simple y entrega rapida.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_32px_-4px_rgba(163,230,53,0.55)]"
              >
                Ir al shop
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={openCart}
                className="inline-flex rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Ver carrito
              </button>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* Trust strip — right above the footer */}
      <div className="border-y border-white/[0.06] bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6 sm:px-6 lg:px-8">
          {trustItems.map((item) => (
            <div
              key={item.label}
              data-reveal
              className="flex items-center gap-2.5 text-sm font-semibold text-slate-300"
            >
              <span className="text-lime-400">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
