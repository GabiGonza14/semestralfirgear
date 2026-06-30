import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'
import { ProductCard } from './ProductCard'
import { products as catalog } from '../data/products'

const ALL = 'Todos'

export function FeaturedProducts() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<string>(ALL)

  // Tabs built from the real catalog categories (reference B pattern).
  const tabs = useMemo(() => {
    const present = Array.from(new Set(catalog.filter((p) => p.isActive).map((p) => p.category)))
    return [ALL, ...present]
  }, [])

  const visible = useMemo(() => {
    const active = catalog.filter((p) => p.isActive)
    const list = activeTab === ALL ? active : active.filter((p) => p.category === activeTab)
    // Featured first, then the rest.
    return [...list].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
  }, [activeTab])

  // Re-stagger the grid whenever the tab changes. Plain `from` (no ScrollTrigger)
  // always settles visible; skipped entirely under reduced motion.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      if (!gridRef.current) return
      const cards = gridRef.current.children
      if (cards.length === 0) return
      gsap.from(cards, {
        y: 18,
        autoAlpha: 0,
        duration: 0.45,
        ease: 'power2.out',
        stagger: 0.06,
        overwrite: true,
      })
    },
    { scope: gridRef, dependencies: [activeTab], revertOnUpdate: true },
  )

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Catalogo</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Productos destacados
          </h2>
          <p className="mt-3 max-w-xl text-slate-400">
            Lo mejor de cada categoria, listo para sumar a tu rutina.
          </p>
        </div>
        <Link
          data-reveal
          to="/shop"
          className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-lime-400 sm:inline-flex"
        >
          Ver todo el catalogo
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Category tabs */}
      <div data-reveal className="mt-8 flex flex-wrap gap-2.5">
        {tabs.map((tab) => {
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-lime-400 text-slate-900 shadow-[0_0_22px_-6px_rgba(163,230,53,0.7)]'
                  : 'border border-white/10 text-slate-300 hover:border-lime-400/40 hover:text-white'
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <div
        ref={gridRef}
        className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      >
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
