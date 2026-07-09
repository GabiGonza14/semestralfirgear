import { useEffect, useMemo, useState } from 'react'
import { createProduct, deleteProduct, getCategories, updateProduct } from '../../api/fitgearApi'
import type { ProductUpsertInput } from '../../api/fitgearApi'
import type { Product } from '../../types'
import { InventoryFilters, type CategoryOption } from './InventoryFilters'
import { ProductFormModal } from './ProductFormModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { ProductTable } from './ProductTable'

interface AdminInventorySectionProps {
  products: Product[]
  onRefreshProducts: () => Promise<void>
}

type ProductStatusFilter = 'all' | 'active' | 'inactive'
type ProductSort = 'nameAsc' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'

export function AdminInventorySection({ products, onRefreshProducts }: AdminInventorySectionProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState<ProductStatusFilter>('all')
  const [sortBy, setSortBy] = useState<ProductSort>('nameAsc')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setCategoriesLoading(true)

    void getCategories()
      .then((result) => {
        if (!active) {
          return
        }

        setCategories(
          result.map((category) => ({
            id: category._id,
            name: category.name,
            requiresSizes: category.requiresSizes,
          })),
        )
        setCategoriesError(null)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setCategoriesError(error instanceof Error ? error.message : 'No se pudieron cargar categorias.')
      })
      .finally(() => {
        if (active) {
          setCategoriesLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

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

      return matchesSearch && matchesCategory && matchesStatus
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
  }, [categoryId, products, search, sortBy, status])

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        requiresSizes: category.requiresSizes,
      })),
    [categories],
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
        categories={categoryOptions}
        onSearchChange={setSearch}
        onCategoryChange={setCategoryId}
        onStatusChange={setStatus}
        onSortChange={setSortBy}
        onCreateClick={handleCreate}
      />

      {categoriesLoading ? (
        <p className="text-sm text-slate-400">Cargando categorias para el inventario...</p>
      ) : null}

      {categoriesError ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {categoriesError}
        </p>
      ) : null}

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

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{filteredProducts.length} productos encontrados</span>
        {categoryNameById.size > 0 ? <span>{categoryNameById.size} categorias disponibles</span> : null}
      </div>

      <ProductTable products={filteredProducts} onEdit={handleEdit} onDelete={handleDelete} />

      <ProductFormModal
        isOpen={isFormOpen}
        title={editingProduct ? 'Editar producto' : 'Agregar producto'}
        submitLabel={editingProduct ? 'Guardar cambios' : 'Crear producto'}
        categories={categoryOptions}
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