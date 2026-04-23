interface CategoryFilterProps {
  categories: ReadonlyArray<{ value: string; label: string }>
  selected: string
  onSelect: (category: string) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect('all')}
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          selected === 'all'
            ? 'bg-red-500 text-white shadow-sm hover:bg-red-600'
            : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        Todas
      </button>
      {categories.map((category) => (
        <button
          key={category.value}
          onClick={() => onSelect(category.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            selected === category.value
              ? 'bg-red-500 text-white shadow-sm hover:bg-red-600'
              : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
