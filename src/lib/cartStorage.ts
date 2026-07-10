import type { Product, SizeLabel } from '../types'

// One line of the cart: a product plus how many, and (for sized categories) which
// size. Mirrors CartItemModel but kept local so this module has no dependency on
// the cart context.
export interface StoredCartLine {
  product: Product
  quantity: number
  size?: SizeLabel
}

// Bump when the persisted shape changes so old payloads are discarded instead of
// being fed into the app in a shape it no longer understands.
const SCHEMA_VERSION = 1

interface StoredCartPayload {
  v: number
  lines: StoredCartLine[]
}

export interface RemovedCartLine {
  id: string
  name: string
}

export interface ReconcileResult {
  items: StoredCartLine[]
  removed: RemovedCartLine[]
}

function isValidLine(value: unknown): value is StoredCartLine {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const line = value as Record<string, unknown>
  const product = line.product as Record<string, unknown> | null | undefined
  if (typeof product !== 'object' || product === null || typeof product.id !== 'string') {
    return false
  }
  return typeof line.quantity === 'number' && Number.isFinite(line.quantity) && line.quantity > 0
}

export function serializeCart(lines: StoredCartLine[]): string {
  const payload: StoredCartPayload = { v: SCHEMA_VERSION, lines }
  return JSON.stringify(payload)
}

// Parses whatever is in localStorage back into cart lines, tolerating every way
// the value can be bad: absent, corrupt JSON, wrong top-level shape, an old
// schema version, or individual malformed lines (which are dropped). Any failure
// yields an empty cart rather than throwing.
export function deserializeCart(raw: string | null): StoredCartLine[] {
  if (!raw) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return []
  }

  const payload = parsed as Record<string, unknown>
  if (payload.v !== SCHEMA_VERSION || !Array.isArray(payload.lines)) {
    return []
  }

  return payload.lines.filter(isValidLine)
}

// Compares the restored cart against the live catalog, dropping any line whose
// product is no longer purchasable (missing from the catalog, deactivated, or out
// of stock) and refreshing the surviving lines with the latest product data so
// prices/stock/images reflect the catalog rather than a stale snapshot. The
// stored quantity is also clamped to the current stock — otherwise a cart
// saved when stock was high would keep showing more units than are actually
// left (checkout still enforces stock server-side, but the cart UI would lie).
export function reconcileCart(
  stored: StoredCartLine[],
  available: Product[],
): ReconcileResult {
  const byId = new Map(available.map((product) => [product.id, product]))
  const items: StoredCartLine[] = []
  const removed: RemovedCartLine[] = []

  for (const line of stored) {
    const fresh = byId.get(line.product.id)
    if (!fresh || !fresh.isActive || fresh.stock <= 0) {
      removed.push({ id: line.product.id, name: line.product.name })
      continue
    }
    const quantity = Math.min(line.quantity, fresh.stock)
    items.push({ ...line, product: fresh, quantity })
  }

  return { items, removed }
}
