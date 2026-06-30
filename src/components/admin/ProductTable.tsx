import { formatCurrency } from '../../utils/format'
import type { Product } from '../../types'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <h3 className="text-lg font-bold text-white">Listado de productos</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.06] text-left text-sm">
          <thead className="bg-white/[0.02] text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Imagen</th>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Categoria</th>
              <th className="px-5 py-3 font-semibold">Precio</th>
              <th className="px-5 py-3 font-semibold">Stock</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-slate-300">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-white">{product.name}</td>
                  <td className="px-5 py-4 text-slate-400">{product.category}</td>
                  <td className="px-5 py-4 font-medium text-white">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        product.stock === 0
                          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30'
                          : product.stock <= 5
                            ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
                            : 'bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30'
                      }`}
                    >
                      {product.stock} unidades
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isActive
                          ? 'bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30'
                          : 'bg-white/[0.06] text-slate-400 ring-1 ring-white/10'
                      }`}
                    >
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="rounded-full bg-rose-500/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  No hay productos para mostrar con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
