import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { Button } from './ui/Button'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <article className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
      <Link to={`/product/${product.id}`}>
        <div className="flex h-48 items-center justify-center bg-gradient-to-b from-gray-50 to-white p-3">
          <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
          {product.category}
        </p>

        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>

        <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>

        <Button fullWidth onClick={() => addItem(product)}>
          Agregar al carrito
        </Button>
      </div>
    </article>
  )
}
