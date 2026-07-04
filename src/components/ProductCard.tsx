import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 5

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30 hover:shadow-[0_24px_50px_-24px_rgba(163,230,53,0.25)]">
      <Link to={`/product/${product.id}`} className="relative block">
        {/* Light image stage so product photos pop on the dark card */}
        <div className="flex aspect-square items-center justify-center bg-gradient-to-b from-white to-slate-100 p-4">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Status badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.featured ? (
            <span className="rounded-full bg-lime-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-900">
              Destacado
            </span>
          ) : null}
          {outOfStock ? (
            <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 ring-1 ring-white/15">
              Agotado
            </span>
          ) : lowStock ? (
            <span className="rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-900">
              Ultimas {product.stock}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime-400">
          {product.category}
        </p>

        <Link to={`/product/${product.id}`} className="flex-1">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white transition group-hover:text-lime-300 sm:text-sm">
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {product.hasDiscount ? (
            <>
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
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
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {product.sizes.length > 0 ? (
          // Sized products need a size picked first — send them to the detail page instead.
          <Link
            to={`/product/${product.id}`}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_24px_-6px_rgba(163,230,53,0.6)]"
          >
            Ver tallas
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => addItem(product)}
            disabled={outOfStock}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_24px_-6px_rgba(163,230,53,0.6)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            {outOfStock ? (
              'Sin stock'
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="20" r="1" fill="currentColor" />
                  <circle cx="18" cy="20" r="1" fill="currentColor" />
                </svg>
                Agregar
              </>
            )}
          </button>
        )}
      </div>
    </article>
  )
}
