import { useEffect, useMemo, useState } from 'react'
import { createProduct, deleteProduct, updateProduct } from '../../api/fitgearApi'
import type { ProductUpsertInput } from '../../api/fitgearApi'
import { isLowStock } from '../../lib/inventory'
import type { Category, Product } from '../../types'
import { InventoryExportControls } from './InventoryExportControls'
import { InventoryFilters } from './InventoryFilters'
import { ProductFormModal } from './ProductFormModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { ProductTable } from './ProductTable'

interface AdminInventorySectionProps {
  products: Product[]
  categories: Category[]
  onRefreshProducts: () => Promise<void>
}

type ProductStatusFilter = 'all' | 'active' | 'inactive'
type ProductSort = 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'

const PAGE_SIZE = 20

export function AdminInventorySection({ products, categories, onRefreshProducts }: AdminInventorySectionProps) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState<ProductStatusFilter>('all')
  const [sortBy, setSortBy] = useState<ProductSort>('nameAsc')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // HU-46: total low-stock count across the whole catalog (not just the current
  // filter), so the chip's badge stays accurate even while other filters narrow
  // the visible table.
  const lowStockCount = useMemo(() => products.filter(isLowStock).length, [products])

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = products.filter((product) => {
      const matchesSearch = normalizedSearch
        ? product.name.toLowerCase().includes(normalizedSearch)
        : true
      const matchesCategory = categoryId === 'all' ? true : product.categoryId === categoryId
      const matchesStatus =
        status === 'all' ? true : status === 'active' ? product.isActive : !product.isActive
      const matchesLowStock = lowStockOnly ? isLowStock(product) : true

      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock
    })

    return [...filtered].sort((left, right) => {
      switch (sortBy) {
        case 'priceAsc':
          return left.price - right.price
        case 'priceDesc':
          return right.price - left.price
        case 'stockAsc':
          return left.stock - right.stock
        case 'stockDesc':
          return right.stock - left.stock
        case 'nameAsc':
        default:
          return left.name.localeCompare(right.name)
      }
    })
  }, [categoryId, lowStockOnly, products, search, sortBy, status])

  // Any filter change can shrink the result set below the current page.
  useEffect(() => {
    setPage(1)
  }, [categoryId, lowStockOnly, search, sortBy, status])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredProducts, currentPage],
  )

  const handleCreate = () => {
    setMutationError(null)
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setMutationError(null)
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingProduct(null)
  }

  const handleSubmitProduct = async (payload: ProductUpsertInput) => {
    setMutationError(null)

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        setSuccessMessage(`"${payload.name}" se actualizo correctamente.`)
      } else {
        await createProduct(payload)
        setSuccessMessage(`"${payload.name}" se agrego correctamente.`)
      }

      await onRefreshProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el producto.'
      setMutationError(message)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  const handleDelete = (product: Product) => {
    setMutationError(null)
    setDeletingProduct(product)
  }

  const closeDelete = () => {
    setDeletingProduct(null)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) {
      return
    }

    try {
      await deleteProduct(deletingProduct.id)
      await onRefreshProducts()
      setSuccessMessage(`"${deletingProduct.name}" se elimino correctamente.`)
      setDeletingProduct(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el producto.'
      setMutationError(message)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  return (
    <div className="space-y-5">
      <InventoryFilters
        search={search}
        categoryId={categoryId}
        status={status}
        sortBy={sortBy}
        categories={categories}
        onSearchChange={setSearch}
        onCategoryChange={setCategoryId}
        onStatusChange={setStatus}
        onSortChange={setSortBy}
        onCreateClick={handleCreate}
      />

      <InventoryExportControls />

      {successMessage ? (
        <p className="rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-300">
          {successMessage}
        </p>
      ) : null}

      {mutationError ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {mutationError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>{filteredProducts.length} productos encontrados</span>
          {categoryNameById.size > 0 ? <span>{categoryNameById.size} categorias disponibles</span> : null}
        </div>

        {lowStockCount > 0 ? (
          <button
            type="button"
            onClick={() => setLowStockOnly((value) => !value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              lowStockOnly
                ? 'bg-amber-400 text-slate-950'
                : 'border border-amber-400/30 text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/10'
            }`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Stock bajo
            <span
              className={`rounded-full px-1.5 text-[10px] ${
                lowStockOnly ? 'bg-slate-950/20 text-slate-900' : 'bg-amber-400/15 text-amber-300'
              }`}
            >
              {lowStockCount}
            </span>
          </button>
        ) : null}
      </div>

      <ProductTable products={pagedProducts} onEdit={handleEdit} onDelete={handleDelete} />

      {filteredProducts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      <ProductFormModal
        isOpen={isFormOpen}
        title={editingProduct ? 'Editar producto' : 'Agregar producto'}
        submitLabel={editingProduct ? 'Guardar cambios' : 'Crear producto'}
        categories={categories}
        initialProduct={editingProduct}
        onClose={closeForm}
        onSubmit={handleSubmitProduct}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingProduct)}
        itemName={deletingProduct?.name ?? ''}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  )
}