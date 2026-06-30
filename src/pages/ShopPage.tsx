import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'
import { ApiError } from '../api/apiClient'
import { getCategories, getProducts } from '../api/fitgearApi'
import { CategoryFilter } from '../components/CategoryFilter'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { categories as fallbackCategoryNames } from '../data/categories'
import { products as fallbackProducts } from '../data/products'
import type { Product } from '../types'

const fallbackCategories = fallbackCategoryNames.map((category) => ({
  value: category,
  label: category,
}))

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

export function ShopPage() {
  const [searchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category')?.trim() || 'all',
  )
  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [sortBy, setSortBy] = useState<'featured' | 'priceAsc' | 'priceDesc'>('featured')
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallbackCatalog, setUseFallbackCatalog] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)

  const activeCategories = useFallbackCatalog ? fallbackCategories : categories

  const activeProducts = useMemo(
    () =>
      useFallbackCatalog
        ? fallbackProducts.map((product) => ({
            ...product,
            categoryId: product.category,
          }))
        : products,
    [products, useFallbackCatalog],
  )

  useEffect(() => {
    let active = true

    void getCategories()
      .then((result) => {
        if (!active) {
          return
        }

        if (result.length === 0) {
          // No categories in database — keep empty categories (no automatic local fallback)
          setCategories([])
          setUseFallbackCatalog(false)
          setLoading(false)
          return
        }

        setCategories(result.map((category) => ({ value: category._id, label: category.name })))
        setUseFallbackCatalog(false)
        setLoading(false)
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }

        // Only enable local fallback for critical server errors (5xx) or network failures.
        if (apiError instanceof ApiError) {
          if (apiError.status >= 500) {
            setUseFallbackCatalog(true)
            setCategories(fallbackCategories)
            setError(null)
          } else {
            setUseFallbackCatalog(false)
            setError(apiError.message)
          }
        } else {
          // Network or unexpected error: treat as critical and enable fallback
          setUseFallbackCatalog(true)
          setCategories(fallbackCategories)
          setError(null)
        }

        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const resolvedCategory = useMemo(() => {
    if (selectedCategory === 'all') {
      return 'all'
    }

    if (activeCategories.some((category) => category.value === selectedCategory)) {
      return selectedCategory
    }

    const found = activeCategories.find(
      (category) => normalizeText(category.label) === normalizeText(selectedCategory),
    )

    // Unknown/legacy category values from URL should not hide the full catalog.
    return found?.value ?? 'all'
  }, [activeCategories, selectedCategory])

  useEffect(() => {
    let active = true

    if (useFallbackCatalog) {
      // If fallback is active we don't attempt product requests.
      return () => {
        active = false
      }
    }

    void Promise.resolve().then(() => {
      if (active) {
        setLoading(true)
      }
    })

    const queryParams =
      sortBy === 'priceAsc'
        ? { sortBy: 'price' as const, sortOrder: 'asc' as const }
        : sortBy === 'priceDesc'
          ? { sortBy: 'price' as const, sortOrder: 'desc' as const }
          : { sortBy: 'createdAt' as const, sortOrder: 'desc' as const }

    void getProducts({
      categoryId: resolvedCategory === 'all' ? undefined : resolvedCategory,
      search: query || undefined,
      ...queryParams,
    })
      .then((result) => {
        if (!active) {
          return
        }

        setProducts(result)
        setError(null)
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }

        // Only enable local fallback for critical server errors (5xx) or network failures.
        if (apiError instanceof ApiError) {
          if (apiError.status >= 500) {
            setUseFallbackCatalog(true)
            setError(null)
          } else {
            setUseFallbackCatalog(false)
            setError(apiError.message)
          }
        } else {
          // Network or unexpected error: treat as critical and enable fallback
          setUseFallbackCatalog(true)
          setError(null)
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
  }, [resolvedCategory, query, sortBy, useFallbackCatalog])

  const displayedProducts = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return activeProducts
      .filter((product) => {
        const matchesCategory =
          resolvedCategory === 'all' || product.categoryId === resolvedCategory
        const matchesSearch =
          normalizedQuery.length === 0 ||
          normalizeText(product.name).includes(normalizedQuery) ||
          normalizeText(product.description).includes(normalizedQuery)

        return matchesCategory && matchesSearch
      })
      .sort((left, right) => {
        if (sortBy === 'priceAsc') {
          return left.price - right.price
        }

        if (sortBy === 'priceDesc') {
          return right.price - left.price
        }

        return 0
      })
  }, [activeProducts, query, resolvedCategory, sortBy])

  const hasProducts = displayedProducts.length > 0

  // Gentle stagger when the result set changes by filter/sort (not per keystroke).
  // Plain `from` with no ScrollTrigger always settles to the visible state.
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
        stagger: 0.05,
        overwrite: true,
      })
    },
    { scope: gridRef, dependencies: [resolvedCategory, sortBy, loading], revertOnUpdate: true },
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Shop</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Catalogo FITGEAR</h1>
          <p className="mt-3 max-w-xl text-slate-400">
            Filtra por categoria, busca productos y ordena para encontrar el accesorio ideal.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al inicio
        </Link>
      </div>

      {/* Toolbar */}
      <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-slate-900/60 p-5 sm:p-6">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CategoryFilter
            categories={activeCategories}
            selected={resolvedCategory ?? 'all'}
            onSelect={setSelectedCategory}
          />
          <label className="relative shrink-0">
            <span className="sr-only">Ordenar productos</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'featured' | 'priceAsc' | 'priceDesc')
              }
              className="cursor-pointer appearance-none rounded-full border border-white/10 bg-slate-950/60 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-200 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30"
            >
              <option value="featured">Destacados</option>
              <option value="priceAsc">Precio: menor a mayor</option>
              <option value="priceDesc">Precio: mayor a menor</option>
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
        </div>
      </div>

      {/* Result count */}
      {!loading && !error && hasProducts ? (
        <p className="text-sm text-slate-400">
          <span className="font-bold text-white">{displayedProducts.length}</span>{' '}
          {displayedProducts.length === 1 ? 'producto' : 'productos'}
        </p>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900"
            >
              <div className="aspect-square animate-pulse bg-slate-800/60" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
                <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
                <div className="h-9 w-full animate-pulse rounded-full bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {/* Empty */}
      {!loading && !error && !hasProducts ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-slate-900/60 px-6 py-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-white">Sin resultados</p>
            <p className="mt-1 text-sm text-slate-400">
              No se encontraron productos con esos filtros. Prueba ajustar la busqueda o la categoria.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSelectedCategory('all')
            }}
            className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {/* Grid */}
      {!loading && hasProducts ? (
        <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
