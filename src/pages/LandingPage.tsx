import { Link } from 'react-router-dom'
import { CategoryCards } from '../components/CategoryCards'
import { HeroCarousel } from '../components/HeroCarousel'

export function LandingPage() {
  return (
    <div className="space-y-12">
      <HeroCarousel />

      <CategoryCards />

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white px-6 py-10 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)] md:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-700">FITGEAR Store</p>
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
              className="inline-flex rounded-full bg-lime-500 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-lime-400 hover:shadow-[0_12px_24px_-16px_rgba(88,214,79,0.7)]"
            >
              Ir al shop
            </Link>
            <Link
              to="/cart"
              className="inline-flex rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-lime-300 hover:bg-lime-50"
            >
              Ver carrito
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
