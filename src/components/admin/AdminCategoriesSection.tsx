import { useMemo, useState } from 'react'
import { createCategory, deleteCategory, updateCategory } from '../../api/fitgearApi'
import type { Category, Product } from '../../types'
import { useAdminNotice } from '../../hooks/useAdminNotice'
import { AdminNotice } from './AdminNotice'
import { DeleteConfirmModal } from './DeleteConfirmModal'

const fieldClass =
  'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400'

// Product counts drive the delete guard: a category with associated products
// cannot be removed, so we surface that count in the UI upfront.
function countProductsByCategory(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const product of products) {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1
  }
  return counts
}

interface AdminCategoriesSectionProps {
  categories: Category[]
  products: Product[]
  onRefresh: () => Promise<void>
}

export function AdminCategoriesSection({ categories, products, onRefresh }: Readonly<AdminCategoriesSectionProps>) {
  const productCountByCategory = useMemo(() => countProductsByCategory(products), [products])
  // Timed, single-slot confirmation/error banner (10s auto-dismiss, no stacking)
  // for toggle / rename / delete outcomes. The create form keeps its own inline
  // validation error (formError) right next to its fields.
  const { notice, notifySuccess, notifyError, dismiss } = useAdminNotice()
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

  const handleToggle = async (category: Category) => {
    setTogglingId(category.id)
    try {
      await updateCategory(category.id, { requiresSizes: !category.requiresSizes })
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo actualizar la categoría.')
    } finally {
      setTogglingId(null)
    }
  }

  const startEdit = (category: Category) => {
    dismiss()
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
      notifyError('El nombre es obligatorio.')
      return
    }

    const newName = editName.trim()
    setSavingEdit(true)
    try {
      await updateCategory(editingId, {
        name: newName,
        description: editDescription.trim(),
      })
      cancelEdit()
      await onRefresh()
      notifySuccess(`La categoría se renombró a "${newName}".`)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo renombrar la categoría.')
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingCategory) {
      return
    }

    // Capture the name before we clear the selection so the confirmation reads
    // correctly even after the modal closes.
    const removedName = deletingCategory.name
    try {
      await deleteCategory(deletingCategory.id)
      setDeletingCategory(null)
      await onRefresh()
      notifySuccess(`La categoría "${removedName}" se eliminó correctamente.`)
    } catch (err) {
      // Re-thrown so DeleteConfirmModal surfaces the error inline and stays open.
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la categoría.'
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

    const createdName = name.trim()
    setCreating(true)
    try {
      await createCategory({ name: createdName, description: description.trim(), requiresSizes })
      setName('')
      setDescription('')
      setRequiresSizes(false)
      await onRefresh()
      notifySuccess(`La categoría "${createdName}" se creó correctamente.`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la categoría.')
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
    return `${deletingCategory.name} tiene ${count} ${count === 1 ? 'producto asociado' : 'productos asociados'}. Reasigna o elimina esos productos antes de borrar la categoría.`
  }, [deletingCategory, productCountByCategory])

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Categorías</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Gestión de categorías</h2>
        <p className="mt-1 text-sm text-slate-500">
          Renombra, elimina o marca qué categorías piden talla (Guantes, Ropa...) para que el
          formulario de productos muestre el selector de tallas en vez del stock plano.
        </p>

        <AdminNotice notice={notice} className="mt-4" />

        <ul className="mt-5 divide-y divide-slate-100">
            {categories.map((category) => {
              const productCount = productCountByCategory[category.id] ?? 0
              const isEditing = editingId === category.id

              return (
                <li key={category.id} className="py-3">
                  {isEditing ? (
                    <form onSubmit={handleSaveEdit} className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-slate-500">
                        <span>Nombre</span>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-slate-500">
                        <span>Descripción</span>
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
                          className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                        {category.description ? (
                          <p className="truncate text-xs text-slate-500">{category.description}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {productCount} {productCount === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className="flex items-center gap-2"
                          title="Si está activo, el formulario de productos de esta categoría muestra el selector de tallas (XS - XXL) en vez del stock plano."
                        >
                          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                            Requiere talla
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggle(category)}
                            disabled={togglingId === category.id}
                            aria-pressed={category.requiresSizes}
                            aria-label={`Requiere tallas: ${category.name}`}
                            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                              category.requiresSizes ? 'bg-emerald-600' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                category.requiresSizes ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Renombrar
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
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
              <li className="py-3 text-sm text-slate-500">Todavía no hay categorías.</li>
            ) : null}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">Nueva categoría</h3>

        {formError ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
              placeholder="Ropa"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-600">
            <span>Descripción</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldClass}
              placeholder="Opcional"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 md:col-span-2">
            <input
              type="checkbox"
              checked={requiresSizes}
              onChange={(event) => setRequiresSizes(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
            />
            <span>Esta categoría requiere talla (XS - XXL)</span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creando...' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </section>

      <DeleteConfirmModal
        isOpen={Boolean(deletingCategory)}
        itemName={deletingCategory?.name ?? ''}
        entityLabel="categoría"
        blockedMessage={deleteBlockedMessage}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
