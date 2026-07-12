import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  getProducts,
  updateCategory,
} from '../../api/fitgearApi'
import type { Category, Product } from '../../types'
import type { MongoCategory } from '../../api/fitgearApi'
import { DeleteConfirmModal } from './DeleteConfirmModal'

const fieldClass =
  'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30 placeholder:text-slate-500'

function mapCategories(raw: MongoCategory[]): Category[] {
  return raw.map((category) => ({
    id: category._id,
    name: category.name,
    description: category.description,
    requiresSizes: category.requiresSizes,
  }))
}

// Product counts drive the delete guard: a category with associated products
// cannot be removed, so we surface that count in the UI upfront.
function countProductsByCategory(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const product of products) {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1
  }
  return counts
}

export function AdminCategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [productCountByCategory, setProductCountByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requiresSizes, setRequiresSizes] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  // Guards every setState below against firing after unmount — loadCategories
  // is called both from the initial effect and after edit/create/delete, so a
  // single ref covers all call sites instead of duplicating the fetch per site.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadCategories = async () => {
    const [categoryResult, products] = await Promise.all([
      getCategories(),
      getProducts({ includeInactive: true }),
    ])

    if (!isMountedRef.current) {
      return
    }
    setCategories(mapCategories(categoryResult))
    setProductCountByCategory(countProductsByCategory(products))
    setError(null)
  }

  useEffect(() => {
    loadCategories()
      .catch((err: unknown) => {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorias.')
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false)
        }
      })
  }, [])

  const handleToggle = async (category: Category) => {
    setTogglingId(category.id)
    try {
      await updateCategory(category.id, { requiresSizes: !category.requiresSizes })
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la categoria.')
    } finally {
      setTogglingId(null)
    }
  }

  const startEdit = (category: Category) => {
    setError(null)
    setEditingId(category.id)
    setEditName(category.name)
    setEditDescription(category.description)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId) {
      return
    }

    if (!editName.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    setSavingEdit(true)
    try {
      await updateCategory(editingId, {
        name: editName.trim(),
        description: editDescription.trim(),
      })
      cancelEdit()
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar la categoria.')
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingCategory) {
      return
    }

    try {
      await deleteCategory(deletingCategory.id)
      setDeletingCategory(null)
      await loadCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la categoria.'
      throw new Error(message)
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }

    setCreating(true)
    try {
      await createCategory({ name: name.trim(), description: description.trim(), requiresSizes })
      setName('')
      setDescription('')
      setRequiresSizes(false)
      await loadCategories()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la categoria.')
    } finally {
      setCreating(false)
    }
  }

  const deleteBlockedMessage = useMemo(() => {
    if (!deletingCategory) {
      return undefined
    }
    const count = productCountByCategory[deletingCategory.id] ?? 0
    if (count === 0) {
      return undefined
    }
    return `${deletingCategory.name} tiene ${count} ${count === 1 ? 'producto asociado' : 'productos asociados'}. Reasigna o elimina esos productos antes de borrar la categoria.`
  }, [deletingCategory, productCountByCategory])

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/[0.08] bg-slate-900 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-400">Categorias</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Gestion de categorias</h2>
        <p className="mt-1 text-sm text-slate-400">
          Renombra, elimina o marca que categorias piden talla (Guantes, Ropa...) para que el
          formulario de productos muestre el selector de tallas en vez del stock plano.
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Cargando categorias...</p>
        ) : (
          <ul className="mt-5 divide-y divide-white/[0.06]">
            {categories.map((category) => {
              const productCount = productCountByCategory[category.id] ?? 0
              const isEditing = editingId === category.id

              return (
                <li key={category.id} className="py-3">
                  {isEditing ? (
                    <form onSubmit={handleSaveEdit} className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        <span>Nombre</span>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        <span>Descripcion</span>
                        <input
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          className={fieldClass}
                          placeholder="Opcional"
                        />
                      </label>
                      <div className="flex gap-2 md:col-span-2">
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="rounded-full bg-lime-400 px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full border border-white/12 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{category.name}</p>
                        {category.description ? (
                          <p className="truncate text-xs text-slate-400">{category.description}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {productCount} {productCount === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className="flex items-center gap-2"
                          title="Si esta activo, el formulario de productos de esta categoria muestra el selector de tallas (XS - XXL) en vez del stock plano."
                        >
                          <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                            Requiere talla
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggle(category)}
                            disabled={togglingId === category.id}
                            aria-pressed={category.requiresSizes}
                            aria-label={`Requiere tallas: ${category.name}`}
                            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                              category.requiresSizes ? 'bg-lime-400' : 'bg-white/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition ${
                                category.requiresSizes ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                        >
                          Renombrar
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
                          className="rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}

            {categories.length === 0 ? (
              <li className="py-3 text-sm text-slate-400">Todavia no hay categorias.</li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-slate-900 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-white">Nueva categoria</h3>

        {formError ? (
          <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
              placeholder="Ropa"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-300">
            <span>Descripcion</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldClass}
              placeholder="Opcional"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-300 md:col-span-2">
            <input
              type="checkbox"
              checked={requiresSizes}
              onChange={(event) => setRequiresSizes(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-950 text-lime-500 accent-lime-400 focus:ring-lime-400"
            />
            <span>Esta categoria requiere talla (XS - XXL)</span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creando...' : 'Crear categoria'}
            </button>
          </div>
        </form>
      </section>

      <DeleteConfirmModal
        isOpen={Boolean(deletingCategory)}
        itemName={deletingCategory?.name ?? ''}
        entityLabel="categoria"
        blockedMessage={deleteBlockedMessage}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
