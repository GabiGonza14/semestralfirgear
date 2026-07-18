import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { getProducts } from '../api/fitgearApi'
import { cartReducer } from '../lib/cartReducer'
import {
  deserializeCart,
  reconcileCart,
  serializeCart,
  type RemovedCartLine,
} from '../lib/cartStorage'
import type { CartItemModel, Product, SizeLabel } from '../types'

const STORAGE_KEY = 'fitgear.cart.v1'

// Reads persisted cart JSON, tolerating server rendering (no window) and a
// storage access that can throw (private mode, quota, disabled cookies).
function readStoredCart(): CartItemModel[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    return deserializeCart(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function writeStoredCart(items: CartItemModel[]): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeCart(items))
  } catch {
    // Best-effort: if storage is unavailable the cart still works in-memory.
  }
}

interface CartLine {
  product: Product
  quantity: number
  size?: SizeLabel
}

interface CartContextValue {
  items: CartLine[]
  subtotal: number
  taxAmount: number
  shippingAmount: number
  total: number
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (product: Product, quantity?: number, size?: SizeLabel) => void
  removeItem: (productId: string, size?: SizeLabel) => void
  removeMany: (lines: Array<{ productId: string; size?: SizeLabel }>) => void
  increase: (productId: string, size?: SizeLabel) => void
  decrease: (productId: string, size?: SizeLabel) => void
  clearCart: () => void
  /** Lines dropped while restoring because their product is no longer available. */
  removedOnRestore: RemovedCartLine[]
  dismissRemovedNotice: () => void
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, [])
  const [isCartOpen, setIsCartOpen] = useState(false)
  // Starts false so the persist effect below skips its first run: on mount the
  // reducer is still the empty SSR state, and writing that would clobber the
  // stored cart before the restore effect has loaded it. Flipping to true after
  // restore re-runs the persist effect with the real cart.
  const [hydrated, setHydrated] = useState(false)
  const [removedOnRestore, setRemovedOnRestore] = useState<RemovedCartLine[]>([])

  // Restore the persisted cart on the client only (never during SSR, which would
  // desync server/client HTML and warn about a hydration mismatch). The stored
  // cart shows immediately; then the live catalog is fetched to drop any line
  // whose product is gone/inactive/out-of-stock, surfacing a notice about it.
  useEffect(() => {
    const stored = readStoredCart()
    if (stored.length > 0) {
      dispatch({ type: 'restore', items: stored })
    }
    setHydrated(true)

    if (stored.length === 0) {
      return
    }

    let active = true
    void getProducts()
      .then((catalog) => {
        if (!active) {
          return
        }
        const { items: reconciled, removed } = reconcileCart(stored, catalog)
        dispatch({ type: 'restore', items: reconciled })
        if (removed.length > 0) {
          setRemovedOnRestore(removed)
        }
      })
      .catch(() => {
        // Catalog fetch failed — keep the optimistic cart rather than wiping it.
      })

    return () => {
      active = false
    }
  }, [])

  // Persist on every change, but only after the restore effect has run.
  useEffect(() => {
    if (!hydrated) {
      return
    }
    writeStoredCart(state)
  }, [state, hydrated])

  const dismissRemovedNotice = useCallback(() => setRemovedOnRestore([]), [])

  const items = useMemo(() => state as CartLine[], [state])

  const subtotal = useMemo(
    () =>
      items.reduce((acc, line) => {
        const unitPrice = line.product.hasDiscount ? line.product.finalPrice : line.product.price
        return acc + unitPrice * line.quantity
      }, 0),
    [items],
  )

  const taxAmount = useMemo(() => roundCurrency(subtotal * TAX_RATE), [subtotal])
  const shippingAmount = useMemo(
    () => (items.length > 0 ? SHIPPING_FEE : 0),
    [items.length],
  )
  const total = useMemo(
    () => roundCurrency(subtotal + taxAmount + shippingAmount),
    [subtotal, taxAmount, shippingAmount],
  )

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  const addItem = useCallback((product: Product, quantity = 1, size?: SizeLabel) => {
    dispatch({ type: 'add', product, quantity, size })
  }, [])

  const removeItem = useCallback((productId: string, size?: SizeLabel) => {
    dispatch({ type: 'remove', productId, size })
  }, [])

  const removeMany = useCallback((lines: Array<{ productId: string; size?: SizeLabel }>) => {
    dispatch({ type: 'removeMany', lines })
  }, [])

  const increase = useCallback((productId: string, size?: SizeLabel) => {
    dispatch({ type: 'increase', productId, size })
  }, [])

  const decrease = useCallback((productId: string, size?: SizeLabel) => {
    dispatch({ type: 'decrease', productId, size })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'clear' })
  }, [])

  const value = useMemo(
    () => ({
      items,
      subtotal,
      taxAmount,
      shippingAmount,
      total,
      isCartOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      removeMany,
      increase,
      decrease,
      clearCart,
      removedOnRestore,
      dismissRemovedNotice,
    }),
    [
      items,
      subtotal,
      taxAmount,
      shippingAmount,
      total,
      isCartOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      removeMany,
      increase,
      decrease,
      clearCart,
      removedOnRestore,
      dismissRemovedNotice,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
