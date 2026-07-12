import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getProducts } from '../api/fitgearApi'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { SectionDecor } from './SectionDecor'

interface PriceTier {
  id: number
  label: string
  min: number
  max: number
}

// Bandas de precio excluyentes — cada opcion muestra productos distintos.
const PRICE_TIERS: PriceTier[] = [
  { id: 1, label: 'Hasta $20', min: 0, max: 20 },
  { id: 2, label: '$20 a $50', min: 20, max: 50 },
  { id: 3, label: '$50 a $100', min: 50, max: 100 },
]

// Show up to 10 products, 5 per page — the arrows page through them.
const PAGE_SIZE = 5
const MAX_PRODUCTS = 10

export function GiftFinder() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tierId, setTierId] = useState<number>(PRICE_TIERS[0].id)
  const [page, setPage] = useState(0)

  // Products come from the DB (same source as the catalog).
  useEffect(() => {
    let active = true

    void getProducts({ sortBy: 'price', sortOrder: 'asc' })
      .then((result) => {
        if (active) {
          setAllProducts(result)
        }
      })
      .catch(() => {
        if (active) {
          setAllProducts([])
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const activeTier = PRICE_TIERS.find((item) => item.id === tierId) ?? PRICE_TIERS[0]

  // Up to 10 matching products within the selected price band, cheapest first.
  const pool = useMemo(
    () =>
      allProducts
        .filter(
          (product) =>
            product.isActive &&
            product.finalPrice > activeTier.min &&
            product.finalPrice <= activeTier.max,
        )
        .sort((left, right) => left.finalPrice - right.finalPrice)
        .slice(0, MAX_PRODUCTS),
    [allProducts, activeTier.min, activeTier.max],
  )

  const pageCount = Math.max(1, Math.ceil(pool.length / PAGE_SIZE))

  // Keep the page in range whenever the filter shrinks the pool.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  const visible = useMemo(
    () => pool.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [pool, page],
  )

  const canPrev = page > 0
  const canNext = page < pageCount - 1

  const handleTier = (nextTierId: number) => {
    setTierId(nextTierId)
    setPage(0)
  }

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-gradient-to-b from-slate-900/40 to-slate-950">
      <SectionDecor pattern="grid" glowA="bg-cyan-500/12" glowB="bg-lime-400/12" watermark="Regala" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div data-reveal>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Ofertas</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Regala deporte
            </h2>
            <p className="mt-3 max-w-xl text-slate-400">
              Encuentra el regalo perfecto para cualquier presupuesto.
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

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div
            data-reveal
            className="inline-flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-slate-900/60 p-1.5"
          >
            {PRICE_TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleTier(tier.id)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition ${
                  tierId === tier.id
                    ? 'bg-lime-400 text-slate-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Carousel arrows — visible only when there is a second page of products */}
          {pageCount > 1 && (
            <div data-reveal className="flex items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={!canPrev}
                aria-label="Ver productos anteriores"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-900/60 text-white transition hover:border-lime-400/50 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                disabled={!canNext}
                aria-label="Ver mas productos"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-900/60 text-white transition hover:border-lime-400/50 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-900" />
            ))}
          </div>
        ) : visible.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {visible.map((product) => (
              <Link
                key={product.id}
                data-reveal
                to="/product/$id"
                params={{ id: product.id }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30 hover:shadow-[0_24px_50px_-24px_rgba(163,230,53,0.25)]"
              >
                <div className="flex aspect-square items-center justify-center bg-gradient-to-b from-white to-slate-100 p-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {product.name}
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-lime-400/80">
                    {product.category}
                  </span>
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
                    {product.hasDiscount ? (
                      <>
                        <span className="text-base font-bold text-white">
                          {formatCurrency(product.finalPrice)}
                        </span>
                        <span className="text-xs text-slate-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300 ring-1 ring-rose-400/30">
                          -{product.discountPercentage}%
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-white">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p data-reveal className="mt-8 text-sm text-slate-400">
            No hay productos en este rango de precio todavia.
          </p>
        )}
      </div>
    </section>
  )
}
