import { ProductModel } from '../models/Product'

// HU-53: inventory report generation. Self-contained (queries ProductModel
// directly, like lowStockService) so it is a single source of truth shared by
// the REST endpoint and the generate_inventory_report MCP tool, and is unaffected
// by test files that mock.module other services.

export interface InventoryReportRow {
  productId: string
  name: string
  category: string
  stock: number
  // Effective unit price: the discounted price when the product is on sale,
  // otherwise the list price — matching how orders value a line item.
  unitPrice: number
  // stock * unitPrice, the inventory value tied up in this product.
  totalValue: number
  // True when stock is at or below the product's low-stock threshold (same rule
  // as getLowStockProducts). Consumers mark these rows visually.
  lowStock: boolean
  lowStockThreshold: number
  isActive: boolean
}

export interface InventoryReportSummary {
  productCount: number
  totalUnits: number
  totalInventoryValue: number
  lowStockCount: number
}

export interface InventoryReport {
  // ISO timestamp of when the snapshot was taken — the report reflects inventory
  // state at generation time (AC).
  generatedAt: string
  summary: InventoryReportSummary
  rows: InventoryReportRow[]
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Builds a point-in-time inventory report over EVERY product (active and
 * inactive), sorted by name. Each row carries stock, effective unit price, the
 * inventory value it represents and a low-stock flag; the summary aggregates the
 * catalog-wide totals used for supplier planning.
 */
export async function buildInventoryReport(): Promise<InventoryReport> {
  const products = await ProductModel.find().populate('categoryId', 'name').sort({ name: 1 })

  let totalUnits = 0
  let totalInventoryValue = 0
  let lowStockCount = 0

  const rows: InventoryReportRow[] = products.map((product) => {
    const category = product.categoryId as unknown as { name?: string } | null
    const unitPrice = product.hasDiscount ? product.finalPrice : product.price
    const totalValue = roundCurrency(unitPrice * product.stock)
    const lowStock = product.stock <= product.lowStockThreshold

    totalUnits += product.stock
    totalInventoryValue += totalValue
    if (lowStock) {
      lowStockCount += 1
    }

    return {
      productId: String(product._id),
      name: product.name,
      category: category?.name ?? 'Sin categoria',
      stock: product.stock,
      unitPrice: roundCurrency(unitPrice),
      totalValue,
      lowStock,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      productCount: rows.length,
      totalUnits,
      totalInventoryValue: roundCurrency(totalInventoryValue),
      lowStockCount,
    },
    rows,
  }
}
