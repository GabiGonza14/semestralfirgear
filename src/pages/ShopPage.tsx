import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useStaggerIn } from '../hooks/useStaggerIn'
import { ApiError } from '../api/apiClient'
import { getCategories, getProducts } from '../api/fitgearApi'
import { CategoryFilter, CategoryIcon } from '../components/CategoryFilter'
import { FloatingShapes } from '../components/FloatingShapes'
import { ProductAutocomplete } from '../components/ProductAutocomplete'
import { ProductCard } from '../components/ProductCard'
import { SectionDecor } from '../components/SectionDecor'
import { Select, type SelectOption } from '../components/ui/Select'
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

const PAGE_SIZE = 30
const SEARCH_DEBOUNCE_MS = 350

type PriceRange = 'all' | 'under20' | '20to50' | '50to100' | 'over100'
type SortBy = 'featured' | 'priceAsc' | 'priceDesc'

const PRICE_OPTIONS: ReadonlyArray<SelectOption<PriceRange>> = [
  { value: 'all', label: 'Todos los precios' },
  { value: 'under20', label: 'Menos de $20' },
  { value: '20to50', label: '$20 - $50' },
  { value: '50to100', label: '$50 - $100' },
  { value: 'over100', label: 'Más de $100' },
]

const SORT_OPTIONS: ReadonlyArray<SelectOption<SortBy>> = [
  { value: 'featured', label: 'Más nuevos' },
  { value: 'priceAsc', label: 'Precio: menor a mayor' },
  { value: 'priceDesc', label: 'Precio: mayor a menor' },
]

// Decorative header badges — reuse the same icon vocabulary as the category
// chips (see CategoryFilter.tsx) so the header and toolbar read as one set.
const HEADER_ACCENT_ICONS = ['Cuerdas', 'Bandas', 'Pesas', 'Botellas']

export function ShopPage() {
  const search = useSearch({ strict: false }) as { category?: string; search?: string }
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>(
    search.category?.trim() || 'all',
  )
  const [query, setQuery] = useState(search.search ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [sortBy, setSortBy] = useState<SortBy>('featured')
  const [priceRange, setPriceRange] = useState<PriceRange>('all')
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallbackCatalog, setUseFallbackCatalog] = useState(false)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const gridRef = useRef<HTMLDivElement>(null)

  // Wait for typing to pause before hitting the API — avoids one request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query])

  // Refetch when the user returns to the tab, so admin edits made elsewhere
  // (new/edited/removed products) show up without a manual reload.
  useEffect(() => {
    const refetchOnReturn = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey((key) => key + 1)
      }
    }
    document.addEventListener('visibilitychange', refetchOnReturn)
    window.addEventListener('focus', refetchOnReturn)
    return () => {
      document.removeEventListener('visibilitychange', refetchOnReturn)
      window.removeEventListener('focus', refetchOnReturn)
    }
  }, [])

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
          return
        }

        setCategories(result.map((category) => ({ value: category._id, label: category.name })))
        setUseFallbackCatalog(false)
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

  // Keep category/search in the URL so a refresh or "back" doesn't lose the filter.
  useEffect(() => {
    const categoryLabel =
      resolvedCategory === 'all'
        ? null
        : (activeCategories.find((category) => category.value === resolvedCategory)?.label ?? null)

    navigate({
      to: '.',
      search: {
        category: categoryLabel ?? undefined,
        search: query || undefined,
      },
      replace: true,
    })
  }, [resolvedCategory, query, activeCategories, navigate])

  useEffect(() => {
    let active = true

    if (useFallbackCatalog) {
      // Fallback catalog is local/static data (see activeProducts) — nothing to
      // fetch, so there's no loading state to wait out.
      setLoading(false)
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
      search: debouncedQuery || undefined,
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
  }, [resolvedCategory, debouncedQuery, sortBy, useFallbackCatalog, refreshKey])

  const displayedProducts = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return activeProducts
      .filter((product) => {
        if (!product.isActive) {
          return false
        }

        const matchesCategory =
          resolvedCategory === 'all' || product.categoryId === resolvedCategory
        const matchesSearch =
          normalizedQuery.length === 0 ||
          normalizeText(product.name).includes(normalizedQuery) ||
          normalizeText(product.description).includes(normalizedQuery)
        const matchesPrice =
          priceRange === 'all'
            ? true
            : priceRange === 'under20'
              ? product.price < 20
              : priceRange === '20to50'
                ? product.price >= 20 && product.price <= 50
                : priceRange === '50to100'
                  ? product.price > 50 && product.price <= 100
                  : product.price > 100

        return matchesCategory && matchesSearch && matchesPrice
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
  }, [activeProducts, query, resolvedCategory, sortBy, priceRange])

  const hasProducts = displayedProducts.length > 0
  const pageCount = Math.max(1, Math.ceil(displayedProducts.length / PAGE_SIZE))

  // New filters/search/sort always start from page 1.
  useEffect(() => {
    setPage(1)
  }, [resolvedCategory, query, sortBy, priceRange])

  // Keep the page in range if the result set shrinks below it.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  const paginatedProducts = useMemo(
    () => displayedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [displayedProducts, page],
  )

  // Changing pages replaces the grid content — bring it back into view instead
  // of leaving the reader scrolled down at whatever the old page ended on.
  const goToPage = (nextPage: number) => {
    setPage(nextPage)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Gentle stagger when the result set changes by filter/sort/page (not per
  // keystroke). Shared pattern — see src/hooks/useStaggerIn.ts.
  useStaggerIn(gridRef, { deps: [resolvedCategory, sortBy, loading, page] })

  return (
    // `isolate` scopes the -z-10 backdrop to this subtree; without a local
    // stacking context it would fall behind the app's slate-950 background.
    <div className="relative isolate space-y-8">
      {/* Ambient catalog backdrop: a dimmed lime dot texture. Sits behind the
          content (-z-10); the panels/cards are opaque so the texture only
          reads through the gaps and margins. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <SectionDecor pattern="dots" dotOpacity={0.5} mask={false} glowA="bg-lime-400/8" glowB="bg-cyan-500/8" />
      </div>
      {/* Outlined geometric shapes, pinned to the side gutters that only exist
          once the viewport is wider than the max-w-7xl content (2xl+). They bleed
          into that margin and never sit behind the product columns. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-24 -right-24 -z-10 hidden 2xl:block"
      >
        <FloatingShapes variant="shop" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="bg-lime-400 px-5 py-2 text-3xl font-black uppercase leading-none tracking-tight text-slate-950 sm:text-4xl"
              style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 1.1rem) 100%, 0 100%)' }}
            >
              Catálogo FITGEAR
            </h1>
            {/* Icon accent — same icon set as the category chips below, so the
                header and the toolbar read as one vocabulary. Purely decorative. */}
            <div aria-hidden className="flex items-center gap-2">
              {HEADER_ACCENT_ICONS.map((label) => (
                <span
                  key={label}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 text-slate-950"
                >
                  <CategoryIcon label={label} className="h-5 w-5" />
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 max-w-xl text-slate-400">
            Todo tu equipo de entrenamiento, en un solo lugar.
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
        <ProductAutocomplete value={query} onChange={setQuery} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CategoryFilter
            categories={activeCategories}
            selected={resolvedCategory ?? 'all'}
            onSelect={setSelectedCategory}
          />
          <div className="flex shrink-0 flex-wrap gap-3">
            <Select
              tone="solid"
              label="Filtrar por precio"
              value={priceRange}
              onChange={setPriceRange}
              options={PRICE_OPTIONS}
            />
            <Select
              tone="solid"
              label="Ordenar productos"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Result count */}
      {!loading && !error && hasProducts ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            <span className="font-bold text-white">{displayedProducts.length}</span>{' '}
            {displayedProducts.length === 1 ? 'producto' : 'productos'}
            {pageCount > 1 ? (
              <span>
                {' '}
                &middot; página <span className="font-bold text-white">{page}</span> de{' '}
                <span className="font-bold text-white">{pageCount}</span>
              </span>
            ) : null}
          </p>
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
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900"
            >
              <div className="aspect-square animate-pulse bg-slate-800/60" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                <div className="h-8 w-full animate-pulse rounded-full bg-slate-800" />
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
              No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría, o limpia los filtros para ver todo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSelectedCategory('all')
              setPriceRange('all')
            }}
            className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {/* Grid */}
      {!loading && hasProducts ? (
        <div ref={gridRef} className="grid scroll-mt-24 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {!loading && hasProducts && pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Página anterior"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => goToPage(pageNumber)}
              aria-current={pageNumber === page}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition ${
                pageNumber === page
                  ? 'bg-lime-400 text-slate-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => goToPage(Math.min(pageCount, page + 1))}
            disabled={page === pageCount}
            aria-label="Página siguiente"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  )
}
