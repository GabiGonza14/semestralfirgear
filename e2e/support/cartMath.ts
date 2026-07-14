// Mirrors src/context/CartContext.tsx's pricing formulas exactly, so specs
// can assert on the OrderSummary's computed numbers instead of hardcoding
// values that would silently drift if the app's tax/shipping rules change.
const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export interface CartLineInput {
  unitPrice: number
  quantity: number
}

export function calcCartTotals(lines: CartLineInput[]) {
  const subtotal = lines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0)
  const taxAmount = roundCurrency(subtotal * TAX_RATE)
  const shippingAmount = lines.length > 0 ? SHIPPING_FEE : 0
  const total = roundCurrency(subtotal + taxAmount + shippingAmount)
  return { subtotal: roundCurrency(subtotal), taxAmount, shippingAmount, total }
}
