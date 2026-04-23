export interface CategoryOption {
  id: string
  name: string
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
}: InventoryFiltersProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-600">
            Inventario
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Gestion de productos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Busca, filtra y administra el catalogo desde un solo lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center justify-center rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
        >
          Agregar producto
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-lime-400"
        />

        <select
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-lime-400"
        >
          <option value="all">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as 'all' | 'active' | 'inactive')}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-lime-400"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) =>
            onSortChange(
              event.target.value as 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc',
            )
          }
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-lime-400"
        >
          <option value="nameAsc">Nombre A-Z</option>
          <option value="priceAsc">Precio: menor a mayor</option>
          <option value="priceDesc">Precio: mayor a menor</option>
          <option value="stockAsc">Stock: menor a mayor</option>
          <option value="stockDesc">Stock: mayor a menor</option>
        </select>
      </div>
    </section>
  )
}