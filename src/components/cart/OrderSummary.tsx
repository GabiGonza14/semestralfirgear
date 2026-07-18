import { motion } from 'framer-motion'
import { EASE_OUT_ATHLETIC, MOTION_DURATION } from '../../lib/motion'
import { formatCurrency } from '../../utils/format'

interface OrderSummaryProps {
  lineCount: number
  subtotal: number
  taxAmount: number
  shippingAmount: number
  total: number
  checkoutError: string | null
  onCheckout: () => void
}

export function OrderSummary({
  lineCount,
  subtotal,
  taxAmount,
  shippingAmount,
  total,
  checkoutError,
  onCheckout,
}: Readonly<OrderSummaryProps>) {
  return (
    <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900 p-6 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold text-white">Resumen de compra</h2>

      <div className="mt-5 space-y-3 border-b border-white/[0.07] pb-5 text-sm text-slate-400">
        <p className="flex justify-between">
          <span>Artículos</span>
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
          <span>Envío</span>
          <span className={`font-medium ${shippingAmount > 0 ? 'text-slate-200' : 'text-lime-400'}`}>
            {shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Gratis'}
          </span>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-lime-400/20 bg-lime-400/[0.08] px-4 py-3">
        <span className="text-base font-bold text-white">Total</span>
        {/* No AnimatePresence: same stuck-exit issue as the drawer shell and
            the item list (see CartDrawer.tsx). The key change alone still
            replays the enter animation on every total change. */}
        <motion.span
          key={total}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.fast, ease: EASE_OUT_ATHLETIC }}
          className="text-lg font-bold text-lime-400"
        >
          {formatCurrency(total)}
        </motion.span>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_28px_-6px_rgba(163,230,53,0.6)]"
      >
        Pagar con tarjeta
      </button>

      {checkoutError ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC }}
          className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {checkoutError}
        </motion.p>
      ) : null}
    </aside>
  )
}
