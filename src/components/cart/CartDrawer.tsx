import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { EASE_OUT_ATHLETIC, MOTION_DURATION } from '../../lib/motion'
import { getButtonClassName } from '../ui/Button'
import { CartItem } from '../CartItem'
import { OrderSummary } from './OrderSummary'

function lineKey(productId: string, size?: string) {
  return `${productId}-${size ?? ''}`
}

interface CartSelectionToolbarProps {
  selectedCount: number
  allSelected: boolean
  onToggleSelectAll: () => void
  onRemoveSelected: () => void
}

// Select-all + bulk-delete bar, pulled out of CartDrawer so its own
// conditional (the button only shows once something's selected) doesn't
// count against the drawer's own cognitive complexity.
function CartSelectionToolbar({
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onRemoveSelected,
}: Readonly<CartSelectionToolbarProps>) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="h-4 w-4 rounded border-white/20 bg-slate-950/50 text-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40"
        />
        <span>Seleccionar todo</span>
      </label>
      {selectedCount > 0 ? (
        <button
          type="button"
          onClick={onRemoveSelected}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10"
        >
          Eliminar seleccionados ({selectedCount})
        </button>
      ) : null}
    </div>
  )
}

export function CartDrawer() {
  const {
    items,
    subtotal,
    taxAmount,
    shippingAmount,
    total,
    isCartOpen,
    closeCart,
    increase,
    decrease,
    removeItem,
    removeMany,
    removedOnRestore,
    dismissRemovedNotice,
  } = useCart()
  const { backendUser } = useAuth()
  const navigate = useNavigate()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  // Keeps the drawer mounted for the duration of the close transition (driven
  // below by `animate`, not AnimatePresence's own mount/exit choreography —
  // that combination once left a stuck, invisible-but-clickable backdrop
  // after closing, see the pointer-events note below). Once the transition
  // finishes, onAnimationComplete unmounts it for real.
  //
  // Adjusted directly during render (not in an effect): React's own recipe
  // for "reset/derive state when a prop changes" — a guarded setState call in
  // the render body, tracking the previous isCartOpen to detect the actual
  // transition rather than re-running on every render.
  const [shouldRender, setShouldRender] = useState(isCartOpen)
  const [prevIsCartOpen, setPrevIsCartOpen] = useState(isCartOpen)
  if (isCartOpen !== prevIsCartOpen) {
    setPrevIsCartOpen(isCartOpen)
    if (isCartOpen) {
      setShouldRender(true)
    } else {
      setSelectedKeys(new Set())
    }
  }

  const lineCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

  const selectedCount = selectedKeys.size
  const allSelected = items.length > 0 && selectedCount === items.length

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(items.map((item) => lineKey(item.product.id, item.size))))
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const removeSelected = () => {
    const lines = items
      .filter((item) => selectedKeys.has(lineKey(item.product.id, item.size)))
      .map((item) => ({ productId: item.product.id, size: item.size }))
    removeMany(lines)
    setSelectedKeys(new Set())
  }

  // Order creation + PaymentIntent setup now happen on the /checkout page
  // itself — this only needs to guard signed-out clicks (same inline message
  // as before) before navigating there.
  const handleCheckout = () => {
    if (!backendUser) {
      setCheckoutError('Debes iniciar sesión para crear una orden.')
      return
    }

    setCheckoutError(null)
    closeCart()
    void navigate({ to: '/checkout' })
  }

  // Escape closes the drawer.
  useEffect(() => {
    if (!isCartOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  // Lock page scroll behind the drawer while it's open.
  useEffect(() => {
    if (!isCartOpen) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isCartOpen])

  if (!shouldRender) {
    return null
  }

  // `pointer-events` is driven directly by `isCartOpen` (real state), not by
  // whether the animation has visually finished — so even if a slow/paused
  // tab leaves the slide-out mid-flight, the backdrop/panel can never eat a
  // click behind them. That's what previously went wrong with a plain
  // AnimatePresence + exit here.
  return (
    <div className={`fixed inset-0 z-[60] ${isCartOpen ? '' : 'pointer-events-none'}`}>
      <motion.button
        type="button"
        onClick={closeCart}
        aria-label="Cerrar carrito"
        tabIndex={isCartOpen ? 0 : -1}
        initial={false}
        animate={{ opacity: isCartOpen ? 1 : 0 }}
        transition={{ duration: MOTION_DURATION.slow, ease: EASE_OUT_ATHLETIC }}
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/70 backdrop-blur-sm ${
          isCartOpen ? '' : 'pointer-events-none'
        }`}
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!isCartOpen}
        aria-label="Carrito de compras"
        initial={false}
        animate={{ x: isCartOpen ? 0 : '100%' }}
        transition={{ duration: MOTION_DURATION.slow, ease: EASE_OUT_ATHLETIC }}
        onAnimationComplete={() => {
          if (!isCartOpen) {
            setShouldRender(false)
          }
        }}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-slate-950 ${
          isCartOpen ? '' : 'pointer-events-none'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            Tu carrito{lineCount > 0 ? ` (${lineCount})` : ''}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-slate-300 transition hover:border-white/30 hover:bg-white/5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {removedOnRestore.length > 0 ? (
          <div className="shrink-0 border-b border-amber-400/20 bg-amber-400/10 px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-amber-200">
                <p className="font-semibold">Algunos productos ya no están disponibles</p>
                <p className="mt-1 text-amber-200/80">
                  Quitamos de tu carrito: {removedOnRestore.map((line) => line.name).join(', ')}.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissRemovedNotice}
                aria-label="Descartar aviso"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/30 text-amber-200 transition hover:bg-amber-400/15"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1.4" fill="currentColor" />
                <circle cx="18" cy="20" r="1.4" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-white">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-slate-400">
                Explora accesorios y arma tu kit de entrenamiento ideal.
              </p>
            </div>
            <Link
              to="/shop"
              onClick={closeCart}
              className={getButtonClassName({ variant: 'primary', className: 'mt-1' })}
            >
              Ir a la tienda
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <CartSelectionToolbar
              selectedCount={selectedCount}
              allSelected={allSelected}
              onToggleSelectAll={toggleSelectAll}
              onRemoveSelected={removeSelected}
            />

            {/* No AnimatePresence on individual rows either — same reasoning
                as the drawer shell above. `layout` on CartItem still animates
                the reflow when a sibling disappears. */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.map((item) => {
                const key = lineKey(item.product.id, item.size)
                return (
                  <CartItem
                    key={key}
                    product={item.product}
                    quantity={item.quantity}
                    size={item.size}
                    selected={selectedKeys.has(key)}
                    onToggleSelect={() => toggleSelect(key)}
                    onIncrease={() => increase(item.product.id, item.size)}
                    onDecrease={() => decrease(item.product.id, item.size)}
                    onRemove={() => removeItem(item.product.id, item.size)}
                  />
                )
              })}
            </div>

            <div className="shrink-0 p-4">
              <OrderSummary
                lineCount={lineCount}
                subtotal={subtotal}
                taxAmount={taxAmount}
                shippingAmount={shippingAmount}
                total={total}
                checkoutError={checkoutError}
                onCheckout={handleCheckout}
              />
            </div>
          </>
        )}
      </motion.aside>
    </div>
  )
}
