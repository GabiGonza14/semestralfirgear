import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../api/fitgearApi'

export function HomeCategoryNav() {
  const navigate = useNavigate()
  const [categoryLinks, setCategoryLinks] = useState<string[]>([])

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
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
        >
          Inicio
        </button>

        {categoryLinks.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => navigate(`/shop?category=${encodeURIComponent(category)}`)}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-red-50 hover:text-red-600"
          >
            {category}
          </button>
        ))}

        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
        >
          Shop
        </button>
      </div>
    </nav>
  )
}