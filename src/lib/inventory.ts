import type { Product } from '../types'

// HU-46: single client-side rule for "is this product low on stock", matching the
// backend's getLowStockProducts query (`stock <= lowStockThreshold`). Shared by the
// inventory table badge and the dashboard summary count so the two never disagree.
// Out-of-stock (0) is a distinct, more urgent state handled separately in the UI.
export function isLowStock(product: Pick<Product, 'stock' | 'lowStockThreshold'>): boolean {
  return product.stock > 0 && product.stock <= product.lowStockThreshold
}
