import { Link } from 'react-router-dom'

const categoryCards = [
  {
    name: 'Fuerza',
    image:
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Agilidad',
    image:
      'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Recuperacion',
    image:
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80',
  },
]

export function CategoryCards() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-700">Categorias</p>
        <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">Solo accesorios fitness</h2>
        <p className="mt-2 text-gray-600">
          Explora por categoria y encuentra rapido lo que necesitas para tu entrenamiento.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {categoryCards.map((category) => (
          <Link
            key={category.name}
            to={`/shop?category=${encodeURIComponent(category.name)}`}
            className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)]"
          >
            <img
              src={category.image}
              alt={category.name}
              className="h-64 w-full object-cover transition duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-2xl font-bold text-white">{category.name}</p>
              <span className="mt-2 inline-flex rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800">
                Ver productos
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
