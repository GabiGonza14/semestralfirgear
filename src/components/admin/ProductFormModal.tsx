import { useEffect, useState } from 'react'
import type { ProductUpsertInput } from '../../api/fitgearApi'
import type { Product } from '../../types'
import type { CategoryOption } from './InventoryFilters'

interface ProductFormModalProps {
  isOpen: boolean
  title: string
  submitLabel: string
  categories: CategoryOption[]
  initialProduct: Product | null
  onClose: () => void
  onSubmit: (payload: ProductUpsertInput) => Promise<void>
}

type ProductFormState = {
  name: string
  description: string
  price: string
  stock: string
  imageFile: File | null
  imagePreview: string
  categoryId: string
  isActive: boolean
}

const createEmptyState = (initialProduct: Product | null, categories: CategoryOption[]): ProductFormState => ({
  name: initialProduct?.name ?? '',
  description: initialProduct?.description ?? '',
  price: initialProduct ? String(initialProduct.price) : '',
  stock: initialProduct ? String(initialProduct.stock) : '',
  imageFile: null,
  imagePreview: initialProduct?.image ?? '',
  categoryId: initialProduct?.categoryId ?? categories[0]?.id ?? '',
  isActive: initialProduct?.isActive ?? true,
})

const maxImageSize = 5 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'])

export function ProductFormModal({
  isOpen,
  title,
  submitLabel,
  categories,
  initialProduct,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormState>(createEmptyState(initialProduct, categories))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (form.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(form.imagePreview)
      }
    }
  }, [form.imagePreview])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(createEmptyState(initialProduct, categories))
    setError(null)
    setIsSaving(false)
  }, [categories, initialProduct, isOpen])

  if (!isOpen) {
    return null
  }

  const handleChange = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null

    if (!selected) {
      return
    }

    if (!allowedImageTypes.has(selected.type)) {
      setError('Solo se permiten imagenes JPG, PNG, WEBP o GIF.')
      event.target.value = ''
      return
    }

    if (selected.size > maxImageSize) {
      setError('La imagen supera el tamano maximo permitido de 5MB.')
      event.target.value = ''
      return
    }

    setError(null)
    setForm((current) => {
      if (current.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(current.imagePreview)
      }

      return {
        ...current,
        imageFile: selected,
        imagePreview: URL.createObjectURL(selected),
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const payload: ProductUpsertInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        imageFile: form.imageFile,
        categoryId: form.categoryId,
        isActive: form.isActive,
      }

      if (
        !payload.name ||
        !payload.description ||
        !payload.categoryId ||
        Number.isNaN(payload.price) ||
        Number.isNaN(payload.stock)
      ) {
        throw new Error('Completa todos los campos obligatorios.')
      }

      if (!initialProduct && !payload.imageFile) {
        throw new Error('Selecciona una imagen para crear el producto.')
      }

      await onSubmit(payload)
      onClose()
    } catch (formError) {
      setError(formError instanceof Error ? formError.message : 'No se pudo guardar el producto.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/20">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-600">Inventario</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-slate-600 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-slate-900 outline-none focus:border-lime-400"
                  placeholder="Creatina FITGEAR, Guantes Pro..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Descripcion
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-24 rounded-2xl border border-gray-200 px-4 py-3 text-slate-900 outline-none focus:border-lime-400"
                  placeholder="Describe el producto..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => handleChange('price', event.target.value)}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-slate-900 outline-none focus:border-lime-400"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => handleChange('stock', event.target.value)}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-slate-900 outline-none focus:border-lime-400"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Imagen del producto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-slate-900 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
                <p className="text-xs text-slate-500">JPG, PNG, WEBP o GIF. Maximo 5MB.</p>
              </label>

              {form.imagePreview ? (
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-700">Preview</p>
                  <img
                    src={form.imagePreview}
                    alt="Preview de producto"
                    className="h-40 w-full rounded-2xl border border-gray-200 bg-white object-contain"
                  />
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Categoria
                <select
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-lime-400"
                >
                  <option value="">Selecciona una categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => handleChange('isActive', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-lime-500 focus:ring-lime-400"
                />
                Producto activo en el catalogo
              </label>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}