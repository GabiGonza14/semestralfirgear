import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProductUpsertInput } from '../../api/fitgearApi'
import type { Product, SizeLabel } from '../../types'
import { SIZE_OPTIONS } from '../../utils/sizes'
import { formatCurrency } from '../../utils/format'
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

interface ImageSlot {
  kind: 'existing' | 'new'
  url: string
  file?: File
}

const MAX_IMAGES = 4

type ProductFormState = {
  name: string
  description: string
  price: string
  stock: string
  lowStockThreshold: string
  images: ImageSlot[]
  categoryId: string
  isActive: boolean
  hasDiscount: boolean
  discountPercentage: string
  /** Present only for sizes the admin has checked; value is the stock string. */
  sizeStocks: Partial<Record<SizeLabel, string>>
}

const createEmptyState = (initialProduct: Product | null, categories: CategoryOption[]): ProductFormState => {
  const sizeStocks: Partial<Record<SizeLabel, string>> = {}
  for (const size of initialProduct?.sizes ?? []) {
    sizeStocks[size.label] = String(size.stock)
  }

  return {
    name: initialProduct?.name ?? '',
    description: initialProduct?.description ?? '',
    price: initialProduct ? String(initialProduct.price) : '',
    stock: initialProduct ? String(initialProduct.stock) : '',
    lowStockThreshold: String(initialProduct?.lowStockThreshold ?? 5),
    images: (initialProduct?.images ?? []).map((url) => ({ kind: 'existing', url })),
    categoryId: initialProduct?.categoryId ?? categories[0]?.id ?? '',
    isActive: initialProduct?.isActive ?? true,
    hasDiscount: initialProduct?.hasDiscount ?? false,
    discountPercentage: initialProduct?.hasDiscount ? String(initialProduct.discountPercentage) : '',
    sizeStocks,
  }
}

const maxImageSize = 5 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'])

const fieldClass =
  'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400'

export function ProductFormModal({
  isOpen,
  title,
  submitLabel,
  categories,
  initialProduct,
  onClose,
  onSubmit,
}: Readonly<ProductFormModalProps>) {
  const [form, setForm] = useState<ProductFormState>(createEmptyState(initialProduct, categories))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Revoke blob previews as they're replaced/removed, and on unmount.
  const blobUrlsRef = useRef<string[]>([])
  useEffect(() => {
    const currentBlobUrls = form.images.filter((slot) => slot.kind === 'new').map((slot) => slot.url)
    const removed = blobUrlsRef.current.filter((url) => !currentBlobUrls.includes(url))
    removed.forEach((url) => URL.revokeObjectURL(url))
    blobUrlsRef.current = currentBlobUrls
  }, [form.images])

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(createEmptyState(initialProduct, categories))
    setError(null)
    setIsSaving(false)
  }, [categories, initialProduct, isOpen])

  const selectedCategory = categories.find((category) => category.id === form.categoryId)
  const requiresSizes = selectedCategory?.requiresSizes ?? false

  const sizesTotalStock = useMemo(
    () =>
      Object.values(form.sizeStocks).reduce((sum, value) => {
        const parsed = Number(value)
        return sum + (Number.isFinite(parsed) ? parsed : 0)
      }, 0),
    [form.sizeStocks],
  )

  const discountPreview = useMemo(() => {
    const originalPrice = Number(form.price)
    const percentage = Number(form.discountPercentage)

    if (!form.hasDiscount || Number.isNaN(originalPrice) || Number.isNaN(percentage)) {
      return null
    }

    const discountAmount = Math.round(originalPrice * percentage) / 100
    const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100

    return { originalPrice, percentage, discountAmount, finalPrice }
  }, [form.discountPercentage, form.hasDiscount, form.price])

  if (!isOpen) {
    return null
  }

  const handleChange = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selected.length === 0) {
      return
    }

    const remainingSlots = MAX_IMAGES - form.images.length
    if (remainingSlots <= 0) {
      setError(`Ya tienes el máximo de ${MAX_IMAGES} imágenes. Elimina una para agregar otra.`)
      return
    }

    const accepted: ImageSlot[] = []
    for (const file of selected.slice(0, remainingSlots)) {
      if (!allowedImageTypes.has(file.type)) {
        setError('Solo se permiten imágenes JPG, PNG, WEBP o GIF.')
        continue
      }
      if (file.size > maxImageSize) {
        setError('La imagen supera el tamaño máximo permitido de 5MB.')
        continue
      }
      accepted.push({ kind: 'new', url: URL.createObjectURL(file), file })
    }

    if (accepted.length > 0) {
      setError(null)
      setForm((current) => ({ ...current, images: [...current.images, ...accepted] }))
    }

    if (selected.length > remainingSlots) {
      setError(`Solo se agregaron ${remainingSlots} imagen(es) — el máximo es ${MAX_IMAGES}.`)
    }
  }

  const handleRemoveImage = (index: number) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }))
  }

  const toggleSize = (label: SizeLabel, checked: boolean) => {
    setForm((current) => {
      const sizeStocks = { ...current.sizeStocks }
      if (checked) {
        sizeStocks[label] = sizeStocks[label] ?? '0'
      } else {
        delete sizeStocks[label]
      }
      return { ...current, sizeStocks }
    })
  }

  const handleSizeStockChange = (label: SizeLabel, value: string) => {
    setForm((current) => ({
      ...current,
      sizeStocks: { ...current.sizeStocks, [label]: value },
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const discountPercentage = form.hasDiscount ? Number(form.discountPercentage) : 0

      const sizes = requiresSizes
        ? SIZE_OPTIONS.filter((label) => form.sizeStocks[label] !== undefined).map((label) => ({
            label,
            stock: Number(form.sizeStocks[label]),
          }))
        : []

      const payload: ProductUpsertInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: requiresSizes ? sizesTotalStock : Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        existingImages: form.images.filter((slot) => slot.kind === 'existing').map((slot) => slot.url),
        newImageFiles: form.images
          .filter((slot): slot is ImageSlot & { file: File } => slot.kind === 'new' && Boolean(slot.file))
          .map((slot) => slot.file),
        categoryId: form.categoryId,
        isActive: form.isActive,
        hasDiscount: form.hasDiscount,
        discountPercentage,
        sizes,
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

      if (Number.isNaN(payload.lowStockThreshold) || payload.lowStockThreshold < 0) {
        throw new Error('El umbral de stock bajo debe ser un número válido (0 o mayor).')
      }

      if (form.images.length === 0) {
        throw new Error('Agrega al menos 1 imagen (máximo 4).')
      }

      if (requiresSizes) {
        if (sizes.length === 0) {
          throw new Error('Esta categoría requiere al menos una talla con stock.')
        }
        if (sizes.some((size) => Number.isNaN(size.stock) || size.stock < 0)) {
          throw new Error('El stock de cada talla debe ser un número válido (0 o mayor).')
        }
      }

      if (form.hasDiscount && (Number.isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100)) {
        throw new Error('El porcentaje de descuento debe estar entre 0 y 100.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Inventario</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
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
              <label className="grid gap-2 text-sm font-medium text-slate-600 md:col-span-2">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className={fieldClass}
                  placeholder="Creatina FITGEAR, Guantes Pro..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-600 md:col-span-2">
                Descripción
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className={`min-h-24 ${fieldClass}`}
                  placeholder="Describe el producto..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-600">
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

              {requiresSizes ? (
                <div className="grid gap-2 text-sm font-medium text-slate-600">
                  Stock total
                  <p className={`${fieldClass} flex items-center text-slate-500`}>
                    {sizesTotalStock} (suma de las tallas)
                  </p>
                </div>
              ) : (
                <label className="grid gap-2 text-sm font-medium text-slate-600">
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
              )}

              <label className="grid gap-2 text-sm font-medium text-slate-600">
                Umbral de stock bajo
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(event) => handleChange('lowStockThreshold', event.target.value)}
                  className={fieldClass}
                  placeholder="5"
                />
                <span className="text-xs font-normal text-slate-500">
                  Se alerta y se avisa por email al admin cuando el stock cae a este valor o menos.
                </span>
              </label>

              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-slate-600">
                  Imágenes del producto ({form.images.length}/{MAX_IMAGES})
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.images.map((slot, index) => (
                    <div
                      key={`${slot.kind}-${slot.url}`}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50"
                    >
                      <img src={slot.url} alt={`Producto ${index + 1}`} className="h-full w-full object-contain p-2" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        aria-label="Quitar imagen"
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-rose-600"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {form.images.length < MAX_IMAGES ? (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="text-xs font-semibold">Agregar</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        multiple
                        onChange={handleImagesChange}
                        className="hidden"
                      />
                    </label>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP o GIF. Máximo 5MB por foto, hasta {MAX_IMAGES} fotos.</p>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-600">
                Categoría
                <select
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {requiresSizes ? (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">
                    Tallas disponibles y stock por talla
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SIZE_OPTIONS.map((size) => {
                      const checked = form.sizeStocks[size] !== undefined
                      return (
                        <div
                          key={size}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                            checked ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <label className="flex flex-1 items-center gap-2 text-sm font-semibold text-slate-900">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => toggleSize(size, event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                            />
                            {size}
                          </label>
                          {checked ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form.sizeStocks[size] ?? ''}
                              onChange={(event) => handleSizeStockChange(size, event.target.value)}
                              placeholder="Stock"
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-500/60"
                            />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => handleChange('isActive', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                />
                Producto activo en el catálogo
              </label>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.hasDiscount}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setForm((current) => ({
                        ...current,
                        hasDiscount: checked,
                        discountPercentage: checked ? current.discountPercentage : '',
                      }))
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  Aplicar descuento a este producto
                </label>

                {form.hasDiscount ? (
                  <div className="grid gap-3">
                    <label className="grid gap-2 text-sm font-medium text-slate-600 md:max-w-xs">
                      Porcentaje de descuento
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.discountPercentage}
                        onChange={(event) => handleChange('discountPercentage', event.target.value)}
                        className={fieldClass}
                        placeholder="0 - 100"
                      />
                    </label>

                    {discountPreview ? (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Precio original</dt>
                        <dd className="col-span-1">{formatCurrency(discountPreview.originalPrice)}</dd>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Descuento</dt>
                        <dd className="col-span-1">{discountPreview.percentage}%</dd>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Monto descontado</dt>
                        <dd className="col-span-1">{formatCurrency(discountPreview.discountAmount)}</dd>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Precio final</dt>
                        <dd className="col-span-1 font-bold text-emerald-700">
                          {formatCurrency(discountPreview.finalPrice)}
                        </dd>
                      </dl>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
