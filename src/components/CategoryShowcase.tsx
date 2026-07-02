import { Link } from 'react-router-dom'
import { products as catalog } from '../data/products'
import { formatCurrency } from '../utils/format'

interface ShowcaseProduct {
  id: string
  name: string
  price: number
  image: string
}

interface CategoryShowcaseItem {
  id: string
  /** Must match a real category value so "Ver productos" filters /shop correctly. */
  category: string
  title: string
  image: string
  imagePosition: 'left' | 'right'
  products: ShowcaseProduct[]
}

// Temporary — the catalog currently has only one product per category. Once
// `src/data/products.ts` (or the backend) has more "Pesas" / "Accesorios"
// products, drop these placeholders and rely fully on `realProductsFor`.
const TEMP_PESAS: ShowcaseProduct[] = [
  {
    id: 'temp-pesas-1',
    name: 'Kit Mancuernas 20kg',
    price: 79.99,
    image: '/uploads/products/kit-de-mancuernas-para-pesas-20-kg-1776876019385.webp',
  },
  {
    id: 'temp-pesas-2',
    name: 'Mancuerna Hexagonal 7.5kg',
    price: 34.5,
    image:
      '/uploads/products/mancuerna-de-crosstraining-y-musculacion-hexagonal-de-7-5-kg-negra-1776876056119.webp',
  },
  {
    id: 'temp-pesas-3',
    name: 'Par Mancuernas 1.5kg',
    price: 15.99,
    image: '/uploads/products/par-de-mancuernas-de-fitness-de-1-5-kg-burdeos-1776876216984.webp',
  },
  {
    id: 'temp-pesas-4',
    name: 'Mancuernas de Fitness 5kg',
    price: 42.0,
    image: '/uploads/products/mancuernas-de-fitness-de-5-kg-negras-2-1776887314381.webp',
  },
  {
    id: 'temp-pesas-5',
    name: 'Mancuerna Individual',
    price: 24.99,
    image: '/uploads/products/mancuerna-1777335111876.png',
  },
]

const TEMP_ACCESORIOS: ShowcaseProduct[] = [
  {
    id: 'temp-acc-1',
    name: 'Cuerda Cross Training',
    price: 19.99,
    image:
      '/uploads/products/cuerda-para-saltar-de-box-de-madera-con-carga-desmontable-1776876737864.webp',
  },
  {
    id: 'temp-acc-2',
    name: 'Kit Masaje 3 en 1',
    price: 27.5,
    image:
      '/uploads/products/kit-de-masaje-3-en-1-con-rodillo-liso-pelota-y-baston-negro-1776877450167.webp',
  },
  {
    id: 'temp-acc-3',
    name: 'Masajeador Manual Roll-On',
    price: 22.0,
    image: '/uploads/products/masajeador-manual-roll-on-1776877368773.webp',
  },
  {
    id: 'temp-acc-4',
    name: 'Cuerda de Gimnasia Ritmica',
    price: 12.99,
    image: '/uploads/products/cuerda-gimnasia-ritmica-rosa-3-metros-1776876713294.webp',
  },
  {
    id: 'temp-acc-5',
    name: 'Masajeador Electronico con Vibracion',
    price: 31.99,
    image: '/uploads/products/masajeador-manual-electronico-con-vibracion-1776877413162.webp',
  },
]

function realProductsFor(category: string): ShowcaseProduct[] {
  return catalog
    .filter((product) => product.isActive && product.category === category)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    }))
}

const SHOWCASE: CategoryShowcaseItem[] = [
  {
    id: 'pesas',
    category: 'Pesas',
    title: 'Pesas',
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
    imagePosition: 'left',
    products: [...realProductsFor('Pesas'), ...TEMP_PESAS].slice(0, 6),
  },
  {
    id: 'accesorios',
    category: 'Accesorios',
    title: 'Accesorios',
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
    imagePosition: 'right',
    products: [...realProductsFor('Accesorios'), ...TEMP_ACCESORIOS].slice(0, 6),
  },
]

export function CategoryShowcase() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div data-reveal className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Destacado</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Compra por categoria
          </h2>
        </div>

        <div className="space-y-14 lg:space-y-16">
          {SHOWCASE.map((item) => (
            <div key={item.id} className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Link
                data-reveal
                to={`/shop?category=${encodeURIComponent(item.category)}`}
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
                  <div
                    key={product.id}
                    data-reveal
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900"
                  >
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-b from-white to-slate-100 p-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                        {product.name}
                      </p>
                      <p className="mt-auto text-sm font-bold tracking-tight text-white sm:text-base">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
