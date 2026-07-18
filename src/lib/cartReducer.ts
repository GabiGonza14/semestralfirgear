import type { CartItemModel, Product, SizeLabel } from '../types'

export type CartAction =
  | { type: 'add'; product: Product; quantity: number; size?: SizeLabel }
  | { type: 'remove'; productId: string; size?: SizeLabel }
  | { type: 'removeMany'; lines: Array<{ productId: string; size?: SizeLabel }> }
  | { type: 'increase'; productId: string; size?: SizeLabel }
  | { type: 'decrease'; productId: string; size?: SizeLabel }
  | { type: 'restore'; items: CartItemModel[] }
  | { type: 'clear' }

// Two lines are the same cart line only if they're the same product AND the
// same size — a product in two different sizes must stay two separate lines.
function isSameLine(item: CartItemModel, productId: string, size: SizeLabel | undefined) {
  return item.product.id === productId && item.size === size
}

// The cap for a cart line: the matching size's stock for sized products,
// otherwise the product's own stock. The single source of truth every
// add/increase path clamps against, so no entry point (product card,
// product detail, or the cart drawer's own +) can push a line past what's
// actually available.
function availableStockFor(product: Product, size: SizeLabel | undefined): number {
  if (size) {
    return product.sizes.find((entry) => entry.label === size)?.stock ?? 0
  }
  return product.stock
}

export function cartReducer(state: CartItemModel[], action: CartAction): CartItemModel[] {
  switch (action.type) {
    case 'add': {
      const cap = availableStockFor(action.product, action.size)
      const existing = state.find((item) => isSameLine(item, action.product.id, action.size))
      if (existing) {
        return state.map((item) =>
          item === existing
            ? { ...item, quantity: Math.min(item.quantity + action.quantity, cap) }
            : item,
        )
      }
      const quantity = Math.min(action.quantity, cap)
      if (quantity <= 0) {
        return state
      }
      return [...state, { product: action.product, quantity, size: action.size }]
    }
    case 'remove':
      return state.filter((item) => !isSameLine(item, action.productId, action.size))
    case 'removeMany':
      return state.filter(
        (item) => !action.lines.some((line) => isSameLine(item, line.productId, line.size)),
      )
    case 'increase':
      return state.map((item) =>
        isSameLine(item, action.productId, action.size)
          ? { ...item, quantity: Math.min(item.quantity + 1, availableStockFor(item.product, item.size)) }
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
    case 'restore':
      return action.items
    case 'clear':
      return state.length > 0 ? [] : state
    default:
      return state
  }
}
