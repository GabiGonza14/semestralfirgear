import { describe, it, expect } from 'bun:test'
import { inventoryPdfFilename, toInventoryPdf } from '../../utils/inventoryPdf'
import type { InventoryReport } from '../../services/inventoryReportService'

const report: InventoryReport = {
  generatedAt: '2026-07-11T10:00:00.000Z',
  summary: { productCount: 2, totalUnits: 15, totalInventoryValue: 210, lowStockCount: 1 },
  rows: [
    {
      productId: 'p1',
      name: 'Banda elástica “pro” con acentos áéíóú ñ',
      category: 'Bandas',
      stock: 3,
      unitPrice: 30,
      totalValue: 90,
      lowStock: true,
      lowStockThreshold: 5,
      isActive: true,
    },
    {
      productId: 'p2',
      name: 'Mancuerna 5kg',
      category: 'Pesas',
      stock: 12,
      unitPrice: 10,
      totalValue: 120,
      lowStock: false,
      lowStockThreshold: 5,
      isActive: false,
    },
  ],
}

describe('toInventoryPdf', () => {
  it('produces a valid PDF byte stream', async () => {
    const bytes = await toInventoryPdf(report)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
    // PDF magic header.
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('does not throw on names with smart quotes / non-WinAnsi chars', async () => {
    // The report name contains a curly quote (”) outside WinAnsi — sanitize must
    // replace it rather than let pdf-lib throw during encoding.
    await expect(toInventoryPdf(report)).resolves.toBeInstanceOf(Uint8Array)
  })
})

describe('inventoryPdfFilename', () => {
  it('date-stamps the filename from generatedAt', () => {
    expect(inventoryPdfFilename('2026-07-11T10:00:00.000Z')).toBe('inventario-2026-07-11.pdf')
  })
})
