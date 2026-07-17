import { formatCurrency } from '../../utils/format'
import { isLowStock } from '../../lib/inventory'
import type { Product } from '../../types'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({ products, onEdit, onDelete }: Readonly<ProductTableProps>) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-lg font-bold text-slate-900">Listado de productos</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Imagen</th>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Categoría</th>
              <th className="px-5 py-3 font-semibold">Precio</th>
              <th className="px-5 py-3 font-semibold">Stock</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">{product.name}</td>
                  <td className="px-5 py-4 text-slate-500">{product.category}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {product.hasDiscount ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                          -{product.discountPercentage}%
                        </span>
                        <span className="text-xs text-slate-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-slate-900">{formatCurrency(product.finalPrice)}</span>
                      </div>
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          product.stock === 0
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                            : isLowStock(product)
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        }`}
                      >
                        {product.stock} unidades
                      </span>
                      {isLowStock(product) ? (
                        <span className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Stock bajo (umbral {product.lowStockThreshold})
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
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
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
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
