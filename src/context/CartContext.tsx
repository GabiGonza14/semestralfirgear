import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type { CartItemModel, Product, SizeLabel } from '../types'

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
  increase: (productId: string, size?: SizeLabel) => void
  decrease: (productId: string, size?: SizeLabel) => void
  clearCart: () => void
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

type CartAction =
  | { type: 'add'; product: Product; quantity: number; size?: SizeLabel }
  | { type: 'remove'; productId: string; size?: SizeLabel }
  | { type: 'increase'; productId: string; size?: SizeLabel }
  | { type: 'decrease'; productId: string; size?: SizeLabel }
  | { type: 'clear' }

// Two lines are the same cart line only if they're the same product AND the
// same size — a product in two different sizes must stay two separate lines.
function isSameLine(item: CartItemModel, productId: string, size: SizeLabel | undefined) {
  return item.product.id === productId && item.size === size
}

function cartReducer(state: CartItemModel[], action: CartAction): CartItemModel[] {
  switch (action.type) {
    case 'add': {
      const existing = state.some((item) => isSameLine(item, action.product.id, action.size))
      if (existing) {
        return state.map((item) =>
          isSameLine(item, action.product.id, action.size)
            ? { ...item, quantity: item.quantity + action.quantity }
            : item,
        )
      }
      return [...state, { product: action.product, quantity: action.quantity, size: action.size }]
    }
    case 'remove':
      return state.filter((item) => !isSameLine(item, action.productId, action.size))
    case 'increase':
      return state.map((item) =>
        isSameLine(item, action.productId, action.size)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    case 'decrease':
      return state
        .map((item) =>
          isSameLine(item, action.productId, action.size)
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0)
    case 'clear':
      return state.length > 0 ? [] : state
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, [])
  const [isCartOpen, setIsCartOpen] = useState(false)

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
    setIsCartOpen(true)
  }, [])

  const removeItem = useCallback((productId: string, size?: SizeLabel) => {
    dispatch({ type: 'remove', productId, size })
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
      increase,
      decrease,
      clearCart,
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
      increase,
      decrease,
      clearCart,
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
