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

const fieldClass =
  'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30 placeholder:text-slate-500'

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
      setError('La imagen supera el tamaño máximo permitido de 5MB.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">Inventario</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-slate-300 transition hover:border-white/30 hover:bg-white/5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-300 md:col-span-2">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className={fieldClass}
                  placeholder="Creatina FITGEAR, Guantes Pro..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300 md:col-span-2">
                Descripcion
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className={`min-h-24 ${fieldClass}`}
                  placeholder="Describe el producto..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => handleChange('price', event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => handleChange('stock', event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-300 md:col-span-2">
                Imagen del producto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-300 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-900 hover:file:bg-lime-300"
                />
                <p className="text-xs text-slate-400">JPG, PNG, WEBP o GIF. Maximo 5MB.</p>
              </label>

              {form.imagePreview ? (
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-300">Preview</p>
                  <img
                    src={form.imagePreview}
                    alt="Preview de producto"
                    className="h-40 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white to-slate-100 object-contain"
                  />
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Categoria
                <select
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Selecciona una categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => handleChange('isActive', event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950 text-lime-500 accent-lime-400 focus:ring-lime-400"
                />
                Producto activo en el catalogo
              </label>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/[0.07] px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
