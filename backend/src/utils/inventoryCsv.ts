import type { InventoryReport } from '../services/inventoryReportService'

// HU-53: serializes an inventory report to CSV. The single CSV source of truth,
// shared by the REST export endpoint and the generate_inventory_report MCP tool.

// Semicolon delimiter: Spanish/Latin Excel locales use ';' as the list separator,
// so a comma-delimited file opens all in one column there. ';' makes the report
// split into columns on a plain double-click, and (since names contain commas,
// not semicolons) also means fewer values need quoting.
const DELIMITER = ';'

// RFC 4180-style escaping: wrap in quotes and double any embedded quote whenever
// the value contains the delimiter, a quote or a newline.
function escapeCsv(value: string | number | boolean): string {
  const str = String(value)
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function joinRow(cells: Array<string | number | boolean>): string {
  return cells.map(escapeCsv).join(DELIMITER)
}

const HEADERS = [
  'Nombre',
  'Categoria',
  'Stock actual',
  'Precio unitario',
  'Valor total',
  'Stock bajo',
  'Umbral',
  'Activo',
]

function formatGeneratedAt(iso: string): string {
  return new Intl.DateTimeFormat('es-PA', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

/**
 * Builds the CSV body for an inventory report. Layout: a title + generation-date
 * header block, the product table, then a totals row. Low-stock products are
 * flagged in the "Stock bajo" column (Si/No) — the CSV's visual marking. Prefixed
 * with a UTF-8 BOM so Excel renders the accents correctly.
 */
export function toInventoryCsv(report: InventoryReport): string {
  const lines: string[] = []

  // Report header block.
  lines.push('Reporte de inventario - FITGEAR')
  lines.push(joinRow(['Generado:', formatGeneratedAt(report.generatedAt)]))
  lines.push('')

  // Table.
  lines.push(joinRow(HEADERS))
  for (const row of report.rows) {
    lines.push(
      joinRow([
        row.name,
        row.category,
        row.stock,
        row.unitPrice.toFixed(2),
        row.totalValue.toFixed(2),
        row.lowStock ? 'Si' : 'No',
        row.lowStockThreshold,
        row.isActive ? 'Si' : 'No',
      ]),
    )
  }

  // Totals row for supplier planning.
  lines.push('')
  lines.push(
    joinRow([
      'TOTAL',
      `${report.summary.productCount} productos`,
      report.summary.totalUnits,
      '',
      report.summary.totalInventoryValue.toFixed(2),
      `${report.summary.lowStockCount} bajos`,
      '',
      '',
    ]),
  )

  return `﻿${lines.join('\r\n')}`
}

// A filesystem-safe, date-stamped filename for the download (e.g.
// inventario-2026-07-11.csv), so the report reflects when it was generated.
export function inventoryCsvFilename(generatedAt: string): string {
  const date = new Date(generatedAt).toISOString().slice(0, 10)
  return `inventario-${date}.csv`
}
