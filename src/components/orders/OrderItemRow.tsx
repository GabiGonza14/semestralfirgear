import { formatCurrency } from '../../utils/format'
import type { BackendOrderItem } from '../../types'

interface OrderItemRowProps {
  item: BackendOrderItem
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-3 sm:grid-cols-[56px_1fr_auto_auto_auto] sm:items-center sm:gap-4">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-white to-slate-100">
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} className="max-h-full max-w-full object-contain p-1" />
        ) : (
          <span className="text-[10px] text-slate-400">Sin imagen</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.productName}</p>
        {item.size ? (
          <p className="truncate text-xs text-slate-400">Talla: {item.size}</p>
        ) : null}
      </div>

      <p className="text-xs text-slate-400 sm:text-sm">Cant: {item.quantity}</p>
      <p className="text-xs text-slate-400 sm:text-sm">Unit: {formatCurrency(item.unitPrice)}</p>
      <p className="text-xs font-semibold text-white sm:text-sm">{formatCurrency(item.subtotal)}</p>
    </div>
  )
}
