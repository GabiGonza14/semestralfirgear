import { ProductModel } from '../models/Product'
import { UserModel } from '../models/User'
import { logger } from '../utils/logger'
import { dispatchNotification } from './notificationService'

// HU-46: low-stock detection and alerting.
//
// This module is intentionally self-contained (imports ProductModel / UserModel /
// dispatchNotification directly, not via other services) so it can be reused by
// both the REST endpoint and the MCP tool as a single source of truth, and so it
// is unaffected by test files that `mock.module` other services.

/**
 * Pure decision: did stock cross the low-stock threshold on the way DOWN in this
 * change? True only when it was strictly above the threshold before and is at or
 * below it now. This is the whole point of HU-46's "email only on crossing" rule:
 *
 * - was above, now at-or-below  -> true  (fire the alert once)
 * - was already at-or-below     -> false (a further drop must NOT re-alert)
 * - moved back above            -> false (restock is not an alert)
 *
 * Keeping this a tiny pure function makes the tricky boundary logic unit-testable
 * without a database.
 */
export function crossedLowStockThreshold(
  previousStock: number,
  newStock: number,
  threshold: number,
): boolean {
  return previousStock > threshold && newStock <= threshold
}

export interface LowStockProduct {
  id: string
  name: string
  stock: number
  lowStockThreshold: number
  isActive: boolean
  category: string
}

// The one query both the dashboard REST endpoint and the MCP tool use, so the
// two never drift. Returns every product currently at or below its own threshold,
// most-critical (lowest stock) first.
export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const products = await ProductModel.find({
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .populate('categoryId', 'name')
    .sort({ stock: 1 })

  return products.map((product) => {
    const category = product.categoryId as unknown as { name?: string } | null
    return {
      id: String(product._id),
      name: product.name,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
      category: category?.name ?? 'Sin categoria',
    }
  })
}

interface LowStockEmailProduct {
  id: string
  name: string
  stock: number
  lowStockThreshold: number
}

function buildLowStockEmail(product: LowStockEmailProduct, to: string) {
  const subject = `Stock bajo: ${product.name} (${product.stock} restantes)`
  const html = `
    <p>El producto <strong>${product.name}</strong> cruzó su umbral de stock bajo.</p>
    <ul>
      <li>Stock actual: <strong>${product.stock}</strong></li>
      <li>Umbral configurado: <strong>${product.lowStockThreshold}</strong></li>
    </ul>
    <p>Reabastece el inventario desde el panel de administración de FITGEAR.</p>
  `.trim()
  const text = `Stock bajo: ${product.name}. Quedan ${product.stock} unidades (umbral ${product.lowStockThreshold}). Reabastece desde el panel de administración.`

  return { to, subject, html, text, type: 'LOW_STOCK' as const }
}

/**
 * Emails every ADMIN when a product has JUST crossed its threshold downward.
 * No-op when there was no crossing, so callers can invoke it unconditionally
 * after any stock change. Fire-and-forget per recipient (uses dispatchNotification,
 * which never throws and gracefully skips when SendGrid isn't configured), so this
 * never blocks or breaks the stock-change flow that triggered it.
 */
export async function notifyAdminsOfLowStockCrossing(
  product: LowStockEmailProduct,
  previousStock: number,
): Promise<void> {
  if (!crossedLowStockThreshold(previousStock, product.stock, product.lowStockThreshold)) {
    return
  }

  try {
    const admins = await UserModel.find({ role: 'ADMIN' }).select('email')
    for (const admin of admins) {
      if (admin.email) {
        dispatchNotification(buildLowStockEmail(product, admin.email))
      }
    }
  } catch (error) {
    // Alerting must never surface as an error to the stock-change path.
    logger.error('[lowStock] failed to notify admins of low-stock crossing', { error })
  }
}
