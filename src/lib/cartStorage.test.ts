import { describe, expect, test } from 'vitest'
import type { Product } from '../types'
import { deserializeCart, reconcileCart, serializeCart } from './cartStorage'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Producto',
    category: 'Cat',
    price: 10,
    stock: 5,
    lowStockThreshold: 5,
    image: '/img.png',
    images: ['/img.png'],
    sizes: [],
    description: 'desc',
    isActive: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 10,
    ...overrides,
  }
}

describe('deserializeCart', () => {
  test('returns empty array for null (nothing stored yet)', () => {
    expect(deserializeCart(null)).toEqual([])
  })

  test('returns empty array for malformed JSON', () => {
    expect(deserializeCart('{ not valid json')).toEqual([])
  })

  test('returns empty array when the stored shape is wrong', () => {
    expect(deserializeCart(JSON.stringify({ foo: 'bar' }))).toEqual([])
    expect(deserializeCart(JSON.stringify([1, 2, 3]))).toEqual([])
  })

  test('ignores an unknown schema version', () => {
    const payload = JSON.stringify({ v: 999, lines: [{ product: makeProduct(), quantity: 1 }] })
    expect(deserializeCart(payload)).toEqual([])
  })

  test('parses valid stored lines back into cart lines', () => {
    const product = makeProduct()
    const raw = serializeCart([{ product, quantity: 2, size: 'M' }])
    expect(deserializeCart(raw)).toEqual([{ product, quantity: 2, size: 'M' }])
  })

  test('drops individual lines that are structurally invalid', () => {
    const product = makeProduct()
    const payload = JSON.stringify({
      v: 1,
      lines: [
        { product, quantity: 2 },
        { product: null, quantity: 1 },
        { product, quantity: 0 },
        { product, quantity: -3 },
        { quantity: 1 },
      ],
    })
    expect(deserializeCart(payload)).toEqual([{ product, quantity: 2 }])
  })
})

describe('serializeCart', () => {
  test('round-trips through deserializeCart', () => {
    const lines = [
      { product: makeProduct({ id: 'a' }), quantity: 1 },
      { product: makeProduct({ id: 'b' }), quantity: 3, size: 'L' as const },
    ]
    expect(deserializeCart(serializeCart(lines))).toEqual(lines)
  })
})

describe('reconcileCart', () => {
  test('keeps lines whose product is still available', () => {
    const product = makeProduct({ id: 'p1', stock: 5 })
    const result = reconcileCart([{ product, quantity: 2 }], [product])
    expect(result.items).toEqual([{ product, quantity: 2 }])
    expect(result.removed).toEqual([])
  })

  test('refreshes the kept line with the latest catalog data', () => {
    const stale = makeProduct({ id: 'p1', price: 10, finalPrice: 10, stock: 5 })
    const fresh = makeProduct({ id: 'p1', price: 12, finalPrice: 12, stock: 4 })
    const result = reconcileCart([{ product: stale, quantity: 1 }], [fresh])
    expect(result.items[0].product).toEqual(fresh)
  })

  test('clamps quantity down to the current stock', () => {
    const fresh = makeProduct({ id: 'p1', stock: 2 })
    const result = reconcileCart([{ product: fresh, quantity: 5 }], [fresh])
    expect(result.items).toEqual([{ product: fresh, quantity: 2 }])
  })

  test('leaves quantity untouched when stock still covers it', () => {
    const fresh = makeProduct({ id: 'p1', stock: 10 })
    const result = reconcileCart([{ product: fresh, quantity: 3 }], [fresh])
    expect(result.items).toEqual([{ product: fresh, quantity: 3 }])
  })

  test('drops a line whose product is no longer in the catalog', () => {
    const gone = makeProduct({ id: 'p1', name: 'Descontinuado' })
    const result = reconcileCart([{ product: gone, quantity: 1 }], [])
    expect(result.items).toEqual([])
    expect(result.removed).toEqual([{ id: 'p1', name: 'Descontinuado' }])
  })

  test('drops a line whose product is inactive', () => {
    const inactive = makeProduct({ id: 'p1', isActive: false })
    const result = reconcileCart([{ product: inactive, quantity: 1 }], [inactive])
    expect(result.items).toEqual([])
    expect(result.removed).toEqual([{ id: 'p1', name: 'Producto' }])
  })

  test('drops a line whose product is out of stock', () => {
    const outOfStock = makeProduct({ id: 'p1', stock: 0 })
    const result = reconcileCart([{ product: outOfStock, quantity: 1 }], [outOfStock])
    expect(result.items).toEqual([])
    expect(result.removed).toEqual([{ id: 'p1', name: 'Producto' }])
  })

  test('partitions a mixed cart into kept and removed', () => {
    const keep = makeProduct({ id: 'keep', stock: 3 })
    const drop = makeProduct({ id: 'drop', name: 'Agotado', stock: 0 })
    const result = reconcileCart(
      [
        { product: keep, quantity: 1 },
        { product: drop, quantity: 2 },
      ],
      [keep, drop],
    )
    expect(result.items).toEqual([{ product: keep, quantity: 1 }])
    expect(result.removed).toEqual([{ id: 'drop', name: 'Agotado' }])
  })
})
