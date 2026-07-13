import { describe, it, expect } from 'bun:test'
import { inventoryCsvFilename, toInventoryCsv } from '../../utils/inventoryCsv'
import type { InventoryReport } from '../../services/inventoryReportService'

const report: InventoryReport = {
  generatedAt: '2026-07-11T10:00:00.000Z',
  summary: { productCount: 2, totalUnits: 15, totalInventoryValue: 210, lowStockCount: 1 },
  rows: [
    {
      productId: 'p1',
      name: 'Banda, elastica "pro"',
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

describe('toInventoryCsv', () => {
  it('starts with a UTF-8 BOM and a title + generated-date header block', () => {
    const csv = toInventoryCsv(report)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Reporte de inventario - FITGEAR')
    expect(csv).toContain('Generado:;')
  })

  it('uses a semicolon-delimited header row (Excel column split)', () => {
    const csv = toInventoryCsv(report)
    expect(csv).toContain('Nombre;Categoria;Stock actual;Precio unitario;Valor total;Stock bajo;Umbral;Activo')
  })

  it('escapes values containing quotes (RFC 4180)', () => {
    const csv = toInventoryCsv(report)
    // The name has a quote → wrapped in quotes with the quote doubled.
    expect(csv).toContain('"Banda, elastica ""pro"""')
  })

  it('marks low-stock products in the "Stock bajo" column and formats prices', () => {
    const csv = toInventoryCsv(report)
    const lines = csv.split('\r\n')
    const bandaLine = lines.find((l) => l.includes('Banda,'))
    const mancuernaLine = lines.find((l) => l.startsWith('Mancuerna 5kg'))
    expect(bandaLine).toContain('30.00') // unit price formatted with 2 decimals
    expect(bandaLine).toContain(';Si;') // low-stock flag
    expect(mancuernaLine).toContain(';No;') // not low-stock
    expect(mancuernaLine).toContain(';No') // inactive product (Activo column)
  })

  it('appends a TOTAL summary row', () => {
    const csv = toInventoryCsv(report)
    expect(csv).toContain('TOTAL')
    expect(csv).toContain('2 productos')
    expect(csv).toContain('210.00')
    expect(csv).toContain('1 bajos')
  })
})

describe('inventoryCsvFilename', () => {
  it('date-stamps the filename from generatedAt', () => {
    expect(inventoryCsvFilename('2026-07-11T10:00:00.000Z')).toBe('inventario-2026-07-11.csv')
  })
})
