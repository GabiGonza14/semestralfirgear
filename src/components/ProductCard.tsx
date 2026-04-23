import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/product/${product.id}`}>
        <div className="flex h-48 items-center justify-center bg-gray-50 p-3">
          <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
          {product.category}
        </p>

        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>

        <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>

        <button
          onClick={() => addItem(product)}
          className="w-full rounded-full bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Agregar al carrito
        </button>
      </div>
    </article>
  )
}
