import { describe, expect, test } from 'vitest'
import type { CartItemModel, Product } from '../types'
import { cartReducer } from './cartReducer'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Pesa 5kg',
    category: 'Pesas',
    price: 20,
    stock: 19,
    lowStockThreshold: 5,
    image: '/img.png',
    images: ['/img.png'],
    sizes: [],
    description: 'desc',
    isActive: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 20,
    ...overrides,
  }
}

describe('cartReducer stock ceiling', () => {
  test('add never lets quantity exceed the product stock', () => {
    const product = makeProduct({ stock: 19 })
    let state: CartItemModel[] = []

    state = cartReducer(state, { type: 'add', product, quantity: 15 })
    state = cartReducer(state, { type: 'add', product, quantity: 15 })

    expect(state[0].quantity).toBe(19)
  })

  test('increase never pushes quantity past the product stock', () => {
    const product = makeProduct({ stock: 3 })
    let state: CartItemModel[] = [{ product, quantity: 3 }]

    state = cartReducer(state, { type: 'increase', productId: product.id })

    expect(state[0].quantity).toBe(3)
  })

  test('increase respects the matching size stock, not the top-level stock', () => {
    const product = makeProduct({
      stock: 999,
      sizes: [
        { label: 'M', stock: 2 },
        { label: 'L', stock: 50 },
      ],
    })
    let state: CartItemModel[] = [{ product, quantity: 2, size: 'M' }]

    state = cartReducer(state, { type: 'increase', productId: product.id, size: 'M' })

    expect(state[0].quantity).toBe(2)
  })

  test('add on a fresh line is clamped to available stock', () => {
    const product = makeProduct({ stock: 4 })
    const state = cartReducer([], { type: 'add', product, quantity: 10 })

    expect(state[0].quantity).toBe(4)
  })
})
