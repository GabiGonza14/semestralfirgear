import { AnimatePresence, motion } from 'framer-motion'
import { formatCurrency } from '../../utils/format'
import { Button } from '../ui/Button'

interface OrderSummaryProps {
  lineCount: number
  subtotal: number
  taxAmount: number
  shippingAmount: number
  total: number
  checkoutPending: boolean
  canReusePendingOrder: boolean
  checkoutError: string | null
  onCheckout: () => void
}

export function OrderSummary({
  lineCount,
  subtotal,
  taxAmount,
  shippingAmount,
  total,
  checkoutPending,
  canReusePendingOrder,
  checkoutError,
  onCheckout,
}: OrderSummaryProps) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]">
      <h2 className="text-xl font-bold text-slate-900">Resumen de compra</h2>
      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <p className="flex justify-between">
          <span>Items</span>
          <span className="font-medium text-slate-800">{lineCount}</span>
        </p>
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span>Impuesto (7%)</span>
          <span className="font-medium text-slate-800">{formatCurrency(taxAmount)}</span>
        </p>
        <p className="flex justify-between">
          <span>Envío</span>
          <span className="font-medium text-slate-800">{shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Gratis'}</span>
        </p>

        <div className="mt-2 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3">
          <p className="flex items-center justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={total}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {formatCurrency(total)}
              </motion.span>
            </AnimatePresence>
          </p>
        </div>
      </div>

      <Button fullWidth disabled={checkoutPending} onClick={onCheckout} className="mt-6">
        {checkoutPending
          ? 'Redirigiendo a Stripe...'
          : canReusePendingOrder
            ? 'Reintentar pago'
            : 'Pagar con tarjeta'}
      </Button>

      <AnimatePresence>
        {checkoutError ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {checkoutError}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <p className="mt-4 text-xs text-slate-500">
        Se crea una orden en estado PENDING y luego se abre Stripe Checkout para completar el pago.
      </p>
    </aside>
  )
}
