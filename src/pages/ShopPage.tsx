import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/apiClient'
import { getCategories, getProducts } from '../api/fitgearApi'
import { CTAButton } from '../components/CTAButton'
import { CategoryFilter } from '../components/CategoryFilter'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { SectionTitle } from '../components/SectionTitle'
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
    .replace(/[\u0300-\u036f]/g, '')
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
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null)

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
          setUseFallbackCatalog(true)
          setCategories(fallbackCategories)
          setCatalogNotice('Mostrando catalogo local de respaldo.')
          setLoading(false)
          return
        }

        setCategories(result.map((category) => ({ value: category._id, label: category.name })))
        setCatalogNotice(null)
        setLoading(false)
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }
        setUseFallbackCatalog(true)
        setCategories(fallbackCategories)
        setError(apiError instanceof Error ? apiError.message : 'No se pudieron cargar categorias.')
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
        setCatalogNotice(null)
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }
        if (apiError instanceof ApiError) {
          setUseFallbackCatalog(true)
          setError(null)
          setCatalogNotice('Conexion temporalmente inestable. Mostrando catalogo local.')
        } else {
          setUseFallbackCatalog(true)
          setError(null)
          setCatalogNotice('Conexion temporalmente inestable. Mostrando catalogo local.')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          eyebrow="Shop"
          title="Catalogo FITGEAR"
          description="Filtra por categoria, busca productos y ordena para encontrar el accesorio ideal."
        />

        <CTAButton to="/" variant="secondary">
          Volver al inicio
        </CTAButton>
      </div>

      <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CategoryFilter
            categories={activeCategories}
            selected={resolvedCategory ?? 'all'}
            onSelect={setSelectedCategory}
          />
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as 'featured' | 'priceAsc' | 'priceDesc')
            }
            className="rounded-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
          >
            <option value="featured">Destacados</option>
            <option value="priceAsc">Precio: menor a mayor</option>
            <option value="priceDesc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      {catalogNotice ? (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-800 shadow-[0_10px_24px_-18px_rgba(88,214,79,0.5)]">
          {catalogNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-700 shadow-sm">
          Cargando catalogo...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {!loading && !error && !hasProducts ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-700 shadow-sm">
          No se encontraron productos con esos filtros.
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
