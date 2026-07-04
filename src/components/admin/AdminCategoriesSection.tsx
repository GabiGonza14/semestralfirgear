import { useEffect, useState } from 'react'
import { createCategory, getCategories, updateCategory } from '../../api/fitgearApi'
import type { Category } from '../../types'

const fieldClass =
  'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30 placeholder:text-slate-500'

export function AdminCategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requiresSizes, setRequiresSizes] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadCategories = () =>
    getCategories()
      .then((result) => {
        setCategories(
          result.map((category) => ({
            id: category._id,
            name: category.name,
            description: category.description,
            requiresSizes: category.requiresSizes,
          })),
        )
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorias.')
      })
      .finally(() => setLoading(false))

  useEffect(() => {
    void loadCategories()
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

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/[0.08] bg-slate-900 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-400">Categorias</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Gestion de categorias</h2>
        <p className="mt-1 text-sm text-slate-400">
          Marca que categorias piden talla (Guantes, Ropa...) para que el formulario de productos
          muestre el selector de tallas en vez del stock plano.
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
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{category.name}</p>
                  {category.description ? (
                    <p className="truncate text-xs text-slate-400">{category.description}</p>
                  ) : null}
                </div>

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
              </li>
            ))}

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
    </div>
  )
}
