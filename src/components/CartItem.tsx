import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

interface CartItemProps {
  product: Product
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export function CartItem({ product, quantity, onIncrease, onDecrease, onRemove }: CartItemProps) {
  return (
    <article className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-[92px_1fr_auto] sm:items-center">
      <img src={product.image} alt={product.name} className="h-24 w-24 rounded-xl object-cover" />

      <div>
        <h3 className="text-lg font-semibold text-slate-100">{product.name}</h3>
        <p className="text-sm text-slate-400">{product.category}</p>
        <p className="mt-1 text-sm text-slate-300">{formatCurrency(product.price)} c/u</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onDecrease} className="h-8 w-8 rounded-full border border-white/20 text-slate-200">
          -
        </button>
        <span className="w-6 text-center text-slate-100">{quantity}</span>
        <button onClick={onIncrease} className="h-8 w-8 rounded-full border border-white/20 text-slate-200">
          +
        </button>
        <button onClick={onRemove} className="ml-2 text-sm text-rose-300 hover:text-rose-200">
          Eliminar
        </button>
      </div>
    </article>
  )
}
