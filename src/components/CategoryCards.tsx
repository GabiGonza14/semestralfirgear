import { Link } from 'react-router-dom'

interface CategoryCard {
  /** Real category label — must match the catalog so /shop filters correctly. */
  name: string
  tagline: string
  image: string
}

const categoryCards: CategoryCard[] = [
  {
    name: 'Pesas',
    tagline: 'Mancuernas y cargas para fuerza',
    image:
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Bandas',
    tagline: 'Resistencia para entrenamiento funcional',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Colchonetas',
    tagline: 'Mats antideslizantes para movilidad',
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
  },
]

export function CategoryCards() {
  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
            Categorias
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Encuentra tu equipo
          </h2>
          <p className="mt-3 max-w-xl text-slate-400">
            Explora por categoria y llega rapido a lo que necesitas para entrenar.
          </p>
        </div>
        <Link
          data-reveal
          to="/shop"
          className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-lime-400 sm:inline-flex"
        >
          Ver todo el catalogo
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {categoryCards.map((category) => (
          <Link
            key={category.name}
            data-reveal
            to={`/shop?category=${encodeURIComponent(category.name)}`}
            className="group relative block overflow-hidden rounded-3xl border border-white/[0.06] bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30 hover:shadow-[0_28px_60px_-24px_rgba(163,230,53,0.25)]"
          >
            <div className="aspect-[4/5] w-full overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                loading="lazy"
              />
            </div>

            {/* Bottom-weighted gradient: text stays legible, image stays vivid */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            {/* Lime underline grows on hover */}
            <div className="absolute bottom-0 left-0 right-0 h-1 origin-left scale-x-0 bg-lime-400 transition-transform duration-300 ease-out group-hover:scale-x-100" />

            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
                {category.tagline}
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">{category.name}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition group-hover:text-lime-400">
                Ver productos
                <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
