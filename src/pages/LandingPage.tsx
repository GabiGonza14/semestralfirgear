import { Link } from 'react-router-dom'
import { CategoryCards } from '../components/CategoryCards'
import { HeroCarousel } from '../components/HeroCarousel'

export function LandingPage() {
  return (
    <div className="space-y-12">
      <HeroCarousel />

      <CategoryCards />

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white px-6 py-10 shadow-sm md:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">FITGEAR Store</p>
          <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">
            Todo para tu entrenamiento en un solo lugar
          </h2>
          <p className="mt-3 text-gray-600">
            Mancuernas, guantes y accesorios fitness con compra simple, entrega rapida y
            experiencia de e-commerce moderna.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Ir al shop
            </Link>
            <Link
              to="/cart"
              className="inline-flex rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
            >
              Ver carrito
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
