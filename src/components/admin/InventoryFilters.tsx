import { Select } from '../ui/Select'

export interface CategoryOption {
  id: string
  name: string
  requiresSizes: boolean
}

interface InventoryFiltersProps {
  search: string
  categoryId: string
  status: 'all' | 'active' | 'inactive'
  sortBy: 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'
  categories: CategoryOption[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void
  onSortChange: (value: 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc') => void
  onCreateClick: () => void
}

const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400'

export function InventoryFilters({
  search,
  categoryId,
  status,
  sortBy,
  categories,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onSortChange,
  onCreateClick,
}: Readonly<InventoryFiltersProps>) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Inventario</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Gestión de productos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Busca, filtra y administra el catálogo desde un solo lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Agregar producto
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre..."
          className={fieldClass}
        />

        <Select
          tone="light"
          fullWidth
          label="Categoría"
          value={categoryId}
          onChange={onCategoryChange}
          options={[
            { value: 'all', label: 'Todas las categorías' },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />

        <Select
          tone="light"
          fullWidth
          label="Estado"
          value={status}
          onChange={(next) => onStatusChange(next as 'all' | 'active' | 'inactive')}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ]}
        />

        <Select
          tone="light"
          fullWidth
          label="Ordenar por"
          value={sortBy}
          onChange={(next) =>
            onSortChange(next as 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc')
          }
          options={[
            { value: 'nameAsc', label: 'Nombre A-Z' },
            { value: 'priceAsc', label: 'Precio: menor a mayor' },
            { value: 'priceDesc', label: 'Precio: mayor a menor' },
            { value: 'stockAsc', label: 'Stock: menor a mayor' },
            { value: 'stockDesc', label: 'Stock: mayor a menor' },
          ]}
        />
      </div>
    </section>
  )
}
