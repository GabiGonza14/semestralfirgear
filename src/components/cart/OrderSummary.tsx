import { AnimatePresence, motion } from 'framer-motion'
import { formatCurrency } from '../../utils/format'

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
    <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900 p-6 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold text-white">Resumen de compra</h2>

      <div className="mt-5 space-y-3 text-sm text-slate-400">
        <p className="flex justify-between">
          <span>Items</span>
          <span className="font-medium text-slate-200">{lineCount}</span>
        </p>
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium text-slate-200">{formatCurrency(subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span>Impuesto (7%)</span>
          <span className="font-medium text-slate-200">{formatCurrency(taxAmount)}</span>
        </p>
        <p className="flex justify-between">
          <span>Envio</span>
          <span className="font-medium text-slate-200">
            {shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Gratis'}
          </span>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-lime-400/20 bg-lime-400/[0.08] px-4 py-3">
        <span className="text-base font-bold text-white">Total</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={total}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-lg font-bold text-lime-400"
          >
            {formatCurrency(total)}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        disabled={checkoutPending}
        onClick={onCheckout}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_28px_-6px_rgba(163,230,53,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {checkoutPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/40 border-t-slate-900" aria-hidden />
            Redirigiendo a Stripe...
          </>
        ) : canReusePendingOrder ? (
          'Reintentar pago'
        ) : (
          'Pagar con tarjeta'
        )}
      </button>

      <AnimatePresence>
        {checkoutError ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {checkoutError}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        Se crea una orden en estado PENDING y luego se abre Stripe Checkout para completar el pago.
      </p>
    </aside>
  )
}
