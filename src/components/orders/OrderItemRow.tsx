import { formatCurrency } from '../../utils/format'
import type { BackendOrderItem } from '../../types'

interface OrderItemRowProps {
  item: BackendOrderItem
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[56px_1fr_auto_auto_auto] sm:items-center sm:gap-4">
      <div className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            Sin imagen
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
        <p className="text-xs text-gray-500">ID: {item.productId}</p>
      </div>

      <p className="text-xs text-gray-600 sm:text-sm">Cant: {item.quantity}</p>
      <p className="text-xs text-gray-600 sm:text-sm">Unit: {formatCurrency(item.unitPrice)}</p>
      <p className="text-xs font-semibold text-gray-900 sm:text-sm">{formatCurrency(item.subtotal)}</p>
    </div>
  )
}