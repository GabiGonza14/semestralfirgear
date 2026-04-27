import { motion } from 'framer-motion'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { Button } from './ui/Button'

interface CartItemProps {
  product: Product
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export function CartItem({ product, quantity, onIncrease, onDecrease, onRemove }: CartItemProps) {
  const subtotal = quantity * product.price

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] sm:grid-cols-[108px_1fr_auto] sm:items-center"
    >
      <img src={product.image} alt={product.name} className="h-24 w-24 rounded-2xl border border-slate-200 object-cover sm:h-28 sm:w-28" />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">{product.category}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{product.name}</h3>
        <p className="mt-2 text-sm text-slate-600">{formatCurrency(product.price)} c/u</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Subtotal: {formatCurrency(subtotal)}</p>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <button
          onClick={onDecrease}
          aria-label="Reducir cantidad"
          className="h-9 w-9 rounded-full border border-slate-300 text-slate-700 transition hover:border-lime-400 hover:text-lime-700"
        >
          -
        </button>
        <span className="w-8 text-center text-base font-semibold text-slate-900">{quantity}</span>
        <button
          onClick={onIncrease}
          aria-label="Aumentar cantidad"
          className="h-9 w-9 rounded-full border border-slate-300 text-slate-700 transition hover:border-lime-400 hover:text-lime-700"
        >
          +
        </button>
        <Button onClick={onRemove} variant="secondary" className="ml-2 px-4 py-2 text-xs">
          Eliminar
        </Button>
      </div>
    </motion.article>
  )
}
