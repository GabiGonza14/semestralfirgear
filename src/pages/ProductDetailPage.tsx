import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/apiClient'
import { getProductById, getProducts } from '../api/fitgearApi'
import { ProductCard } from '../components/ProductCard'
import { SectionTitle } from '../components/SectionTitle'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

export function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Producto no encontrado')
      setLoading(false)
      return
    }

    let active = true

    setLoading(true)
    setError(null)

    void getProductById(id)
      .then(async (result) => {
        if (!active) {
          return
        }
        setProduct(result)

        const relatedProducts = await getProducts({ categoryId: result.categoryId })
        if (!active) {
          return
        }
        setRelated(relatedProducts.filter((item) => item.id !== result.id).slice(0, 3))
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }
        if (apiError instanceof ApiError && apiError.status === 404) {
          setError('Producto no encontrado')
          return
        }
        setError(apiError instanceof Error ? apiError.message : 'No se pudo cargar el producto.')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-700 shadow-sm">
        Cargando producto...
      </div>
    )
  }

  if (!product || error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">{error ?? 'Producto no encontrado'}</h2>
        <Link to="/shop" className="mt-4 inline-flex text-red-500 hover:text-red-600">
          Volver al catalogo
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="rounded-2xl bg-gray-50 p-4">
          <img
            src={product.image}
            alt={product.name}
            className="h-full min-h-80 w-full rounded-2xl object-cover shadow-sm"
          />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
            {product.category}
          </p>
          <h1 className="text-4xl font-black text-gray-900">{product.name}</h1>
          <p className="text-gray-700">{product.description}</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</p>
          <p className="text-sm text-gray-600">Stock disponible: {product.stock} unidades</p>
          <button
            onClick={() => addItem(product)}
            className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Agregar al carrito
          </button>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Relacionados"
          title="Productos relacionados"
          description="Complementa tu compra con otros accesorios de la misma categoria."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
