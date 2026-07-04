import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/apiClient'
import { getProductById, getProducts } from '../api/fitgearApi'
import { ProductCard } from '../components/ProductCard'
import { ProductGallery } from '../components/product/ProductGallery'
import { ProductSizeSelector } from '../components/product/ProductSizeSelector'
import { useCart } from '../context/CartContext'
import type { Product, SizeLabel } from '../types'
import { formatCurrency } from '../utils/format'

const trustPoints = [
  'Envio rapido a todo el pais',
  'Compra protegida con Stripe',
  'Devoluciones faciles',
]

function getStockBadge(outOfStock: boolean, lowStock: boolean, stock: number): ReactNode {
  if (outOfStock) {
    return (
      <span className="mb-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400 ring-1 ring-white/10">
        Agotado
      </span>
    )
  }

  if (lowStock) {
    return (
      <span className="mb-1 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-900">
        Ultimas {stock} unidades
      </span>
    )
  }

  return (
    <span className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400">
      <span className="h-2 w-2 rounded-full bg-lime-400" aria-hidden />
      {stock} en stock
    </span>
  )
}

function getAddToCartLabel(outOfStock: boolean, needsSizeChoice: boolean) {
  if (outOfStock) {
    return 'Sin stock'
  }
  if (needsSizeChoice) {
    return 'Elige una talla'
  }
  return 'Agregar al carrito'
}

export function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<SizeLabel | null>(null)

  // A different product was opened — reset the picker state back to defaults.
  useEffect(() => {
    setQuantity(1)
    setSelectedSize(null)
  }, [id])

  // Reflect the product in the browser tab, and restore the site default on leave.
  useEffect(() => {
    if (!product) {
      return
    }
    const previousTitle = document.title
    document.title = `${product.name} · FITGEAR`
    return () => {
      document.title = previousTitle
    }
  }, [product])

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

        // An admin-deactivated product is off-limits from direct links too —
        // treat it exactly like a missing product instead of leaking it.
        if (!result.isActive) {
          setError('Producto no encontrado')
          return
        }

        setProduct(result)

        const relatedProducts = await getProducts({ categoryId: result.categoryId })
        if (!active) {
          return
        }
        setRelated(
          relatedProducts
            .filter((item) => item.isActive && item.id !== result.id)
            .slice(0, 3),
        )
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
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-slate-900" />
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="h-20 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
          <div className="h-12 w-full animate-pulse rounded-full bg-slate-800" />
        </div>
      </div>
    )
  }

  if (!product || error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-slate-900/60 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">{error ?? 'Producto no encontrado'}</h2>
        <p className="max-w-sm text-sm text-slate-400">
          Es posible que el producto ya no este disponible en el catalogo.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
        >
          Volver al catalogo
        </Link>
      </div>
    )
  }

  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 5
  const hasSizes = product.sizes.length > 0
  const selectedSizeEntry = product.sizes.find((size) => size.label === selectedSize)
  const maxQuantity = hasSizes ? selectedSizeEntry?.stock ?? 0 : product.stock
  const needsSizeChoice = hasSizes && !selectedSize
  const canAddToCart = !outOfStock && (!hasSizes || Boolean(selectedSizeEntry))
  const images = product.images.length > 0 ? product.images : [product.image]

  const handleSelectSize = (label: SizeLabel, stock: number) => {
    setSelectedSize(label)
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(stock, 1))))
  }

  return (
    <div className="space-y-14">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link to="/shop" className="transition hover:text-lime-400">
          Shop
        </Link>
        <span className="text-slate-600">/</span>
        <Link
          to={`/shop?category=${encodeURIComponent(product.category)}`}
          className="transition hover:text-lime-400"
        >
          {product.category}
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300">{product.name}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <ProductGallery key={product.id} images={images} alt={product.name} />

        {/* Info */}
        <div className="space-y-6 lg:pt-2">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
              {product.category}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">{product.name}</h1>
            <p className="leading-relaxed text-slate-400">{product.description}</p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {product.hasDiscount ? (
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-4xl font-bold tracking-tight text-white">
                  {formatCurrency(product.finalPrice)}
                </p>
                <p className="mb-1 text-lg text-slate-500 line-through">
                  {formatCurrency(product.price)}
                </p>
                <span className="mb-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/30">
                  -{product.discountPercentage}%
                </span>
              </div>
            ) : (
              <p className="text-4xl font-bold tracking-tight text-white">
                {formatCurrency(product.price)}
              </p>
            )}
            {getStockBadge(outOfStock, lowStock, product.stock)}
          </div>

          {hasSizes ? (
            <ProductSizeSelector sizes={product.sizes} selectedSize={selectedSize} onSelect={handleSelectSize} />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {outOfStock ? null : (
              <div className="inline-flex items-center rounded-full border border-white/12 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  aria-label="Disminuir cantidad"
                  className="inline-flex h-12 w-11 items-center justify-center text-white transition hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="w-8 text-center text-sm font-bold text-white" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                  disabled={quantity >= maxQuantity}
                  aria-label="Aumentar cantidad"
                  className="inline-flex h-12 w-11 items-center justify-center text-white transition hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => addItem(product, quantity, selectedSize ?? undefined)}
              disabled={!canAddToCart}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-lime-400 px-7 py-4 text-sm font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_32px_-6px_rgba(163,230,53,0.6)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none sm:flex-none"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
              {getAddToCartLabel(outOfStock, needsSizeChoice)}
            </button>
          </div>

          <ul className="grid gap-3 border-t border-white/[0.07] pt-6">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-400/15 text-lime-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
              Relacionados
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Completa tu equipo
            </h2>
            <p className="mt-2 text-slate-400">
              Otros accesorios de la misma categoria.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
