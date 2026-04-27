import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../api/fitgearApi'

export function HomeCategoryNav() {
  const navigate = useNavigate()
  const [categoryLinks, setCategoryLinks] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('Inicio')

  useEffect(() => {
    let active = true

    void getCategories()
      .then((categories) => {
        if (!active) {
          return
        }

        const uniqueNames = Array.from(
          new Set(
            categories
              .map((category) => category.name.trim())
              .filter((name) => name.length > 0),
          ),
        )

        setCategoryLinks(uniqueNames)
      })
      .catch(() => {
        if (active) {
          setCategoryLinks([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <nav className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => {
            setSelected('Inicio')
            navigate('/')
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selected === 'Inicio'
              ? 'bg-lime-100 text-lime-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Inicio
        </button>

        {categoryLinks.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setSelected(category)
              navigate(`/shop?category=${encodeURIComponent(category)}`)
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selected === category
                ? 'bg-lime-100 text-lime-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {category}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setSelected('Shop')
            navigate('/shop')
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selected === 'Shop'
              ? 'bg-lime-100 text-lime-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Shop
        </button>

        <button
          type="button"
          onClick={() => navigate('/shop?sortBy=price&sortOrder=asc')}
          className="rounded-full px-4 py-2 text-sm font-semibold text-lime-700 transition hover:bg-lime-50"
        >
          Descuentos
        </button>
      </div>
    </nav>
  )
}