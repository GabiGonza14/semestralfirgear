import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { CartItemModel, Product } from '../types'

interface CartLine {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartLine[]
  subtotal: number
  taxAmount: number
  shippingAmount: number
  total: number
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  increase: (productId: string) => void
  decrease: (productId: string) => void
  clearCart: () => void
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

type CartAction =
  | { type: 'add'; product: Product }
  | { type: 'remove'; productId: string }
  | { type: 'increase'; productId: string }
  | { type: 'decrease'; productId: string }
  | { type: 'clear' }

function cartReducer(state: CartItemModel[], action: CartAction): CartItemModel[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((item) => item.product.id === action.product.id)
      if (existing) {
        return state.map((item) =>
          item.product.id === action.product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...state, { product: action.product, quantity: 1 }]
    }
    case 'remove':
      return state.filter((item) => item.product.id !== action.productId)
    case 'increase':
      return state.map((item) =>
        item.product.id === action.productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    case 'decrease':
      return state
        .map((item) =>
          item.product.id === action.productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0)
    case 'clear':
      return []
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, [])

  const items = useMemo(() => state as CartLine[], [state])

  const subtotal = useMemo(
    () => items.reduce((acc, line) => acc + line.product.price * line.quantity, 0),
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

  const value = useMemo(
    () => ({
      items,
      subtotal,
      taxAmount,
      shippingAmount,
      total,
      addItem: (product: Product) => dispatch({ type: 'add', product }),
      removeItem: (productId: string) => dispatch({ type: 'remove', productId }),
      increase: (productId: string) => dispatch({ type: 'increase', productId }),
      decrease: (productId: string) => dispatch({ type: 'decrease', productId }),
      clearCart: () => dispatch({ type: 'clear' }),
    }),
    [items, subtotal, taxAmount, shippingAmount, total],
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
