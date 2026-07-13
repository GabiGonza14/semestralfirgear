import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getCategories, getProducts } from '../api/fitgearApi'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

interface Category {
  id: string
  name: string
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

// Banner por categoria conocida; el resto usa la primera imagen de sus productos.
const CATEGORY_IMAGES: Record<string, string> = {
  pesas:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
  bandas:
    'https://images.unsplash.com/photo-1776710669928-e49471c63af5?auto=format&fit=crop&w=1400&h=933&q=80',
  colchonetas:
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1400&q=80',
  accesorios:
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1400&q=80',
  guantes:
    'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?auto=format&fit=crop&w=1400&q=80',
  botellas:
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1400&q=80',
}

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80'

// Solo estas dos categorias se muestran en "Destacado", en este orden.
const FEATURED_CATEGORIES = ['Pesas', 'Bandas']

export function CategoryShowcase() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void Promise.all([
      getCategories(),
      getProducts({ sortBy: 'createdAt', sortOrder: 'desc' }),
    ])
      .then(([cats, prods]) => {
        if (!active) return
        setCategories(cats.map((category) => ({ id: category._id, name: category.name })))
        setProducts(prods)
      })
      .catch(() => {
        if (active) {
          setCategories([])
          setProducts([])
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
  }, [])

  // Une cada categoria destacada (Pesas, Bandas) con sus productos de la BD.
  const showcase = useMemo(
    () =>
      FEATURED_CATEGORIES.map((name) =>
        categories.find((category) => normalize(category.name) === normalize(name)),
      )
        .filter((category): category is Category => Boolean(category))
        .map((category, index) => {
          const categoryProducts = products
            .filter((product) => product.isActive && product.categoryId === category.id)
            .slice(0, 6)

          const image =
            CATEGORY_IMAGES[normalize(category.name)] ??
            categoryProducts[0]?.image ??
            DEFAULT_CATEGORY_IMAGE

          const imagePosition: 'left' | 'right' = index % 2 === 0 ? 'left' : 'right'

          return {
            id: category.id,
            category: category.name,
            title: category.name,
            image,
            products: categoryProducts,
            imagePosition,
          }
        })
        .filter((item) => item.products.length > 0),
    [categories, products],
  )

  if (!loading && showcase.length === 0) {
    return null
  }

  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div data-reveal className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Destacado</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Compra por categoría
          </h2>
        </div>

        {loading ? (
          <div className="space-y-14 lg:space-y-16">
            {[0, 1].map((index) => (
              <div key={index} className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="h-72 animate-pulse rounded-3xl bg-slate-900 sm:h-96 lg:h-full" />
                <div className="grid grid-cols-3 grid-rows-2 gap-3 sm:gap-4 lg:gap-5">
                  {Array.from({ length: 6 }).map((_, cardIndex) => (
                    <div key={cardIndex} className="aspect-square animate-pulse rounded-2xl bg-slate-900" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-14 lg:space-y-16">
            {showcase.map((item) => (
              <div key={item.id} className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                <Link
                  data-reveal
                  to="/shop"
                  search={{ category: item.category }}
                  className={`group relative order-1 block h-72 overflow-hidden rounded-3xl border border-white/[0.08] sm:h-96 lg:h-full ${
                    item.imagePosition === 'right' ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10" />

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <span className="mb-3 block h-1 w-12 bg-lime-400" />
                    <h3 className="font-display text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">
                      {item.title}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition group-hover:text-lime-400">
                      Ver productos
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>

                <div
                  className={`order-2 grid grid-cols-3 grid-rows-2 gap-3 sm:gap-4 lg:gap-5 ${
                    item.imagePosition === 'right' ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  {item.products.map((product) => (
                    <Link
                      key={product.id}
                      data-reveal
                      to="/product/$id"
                      params={{ id: product.id }}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30 hover:shadow-[0_20px_40px_-24px_rgba(163,230,53,0.3)]"
                    >
                      <div className="flex aspect-square items-center justify-center bg-gradient-to-b from-white to-slate-100 p-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                          {product.name}
                        </p>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5">
                          {product.hasDiscount ? (
                            <>
                              <span className="text-sm font-bold tracking-tight text-white sm:text-base">
                                {formatCurrency(product.finalPrice)}
                              </span>
                              <span className="text-[11px] text-slate-500 line-through">
                                {formatCurrency(product.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold tracking-tight text-white sm:text-base">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
