import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Product, SizeLabel } from '../types'
import { formatCurrency } from '../utils/format'

interface CartItemProps {
  product: Product
  quantity: number
  size?: SizeLabel
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export function CartItem({ product, quantity, size, onIncrease, onDecrease, onRemove }: CartItemProps) {
  const unitPrice = product.hasDiscount ? product.finalPrice : product.price
  const subtotal = quantity * unitPrice

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="grid gap-4 rounded-2xl border border-white/[0.08] bg-slate-900 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center"
    >
      <Link
        to={`/product/${product.id}`}
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-100 p-2 sm:h-24 sm:w-24"
      >
        <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
      </Link>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400">{product.category}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="mt-1 truncate text-base font-semibold text-white transition hover:text-lime-300">
            {product.name}
          </h3>
        </Link>
        {size ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Talla: <span className="text-white">{size}</span>
          </p>
        ) : null}
        <p className="mt-1.5 text-sm text-slate-400">
          {formatCurrency(unitPrice)} c/u
          {product.hasDiscount ? (
            <span className="ml-1.5 text-slate-500 line-through">
              {formatCurrency(product.price)}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">
          Subtotal: {formatCurrency(subtotal)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 p-1">
          <button
            type="button"
            onClick={onDecrease}
            aria-label="Reducir cantidad"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-lime-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="w-8 text-center text-sm font-bold text-white">{quantity}</span>
          <button
            type="button"
            onClick={onIncrease}
            aria-label="Aumentar cantidad"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-lime-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-rose-400"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Eliminar
        </button>
      </div>
    </motion.article>
  )
}
