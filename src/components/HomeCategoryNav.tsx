import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
            navigate({ to: '/' })
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selected === 'Inicio'
              ? 'bg-lime-100 text-lime-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Inicio
        </button>

        <button
          type="button"
          onClick={() => {
            setSelected('shop')
            navigate({ to: '/shop' })
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selected === 'shop'
              ? 'bg-lime-100 text-lime-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Todas
        </button>

        {categoryLinks.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setSelected(category)
              navigate({ to: '/shop', search: { category } })
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
      </div>
    </nav>
  )
}