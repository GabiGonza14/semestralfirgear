import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { buildInventoryReport } from '../services/inventoryReportService'
import { inventoryCsvFilename, toInventoryCsv } from '../utils/inventoryCsv'
import { inventoryPdfFilename, toInventoryPdf } from '../utils/inventoryPdf'
import type { InventoryReportQuery } from '../validations/inventoryValidation'

// HU-53: GET /api/admin/inventory-report. Authorization (valid Clerk JWT + ADMIN
// role) is enforced upstream by the /api/admin router. Returns a point-in-time
// inventory report as JSON (default) or as a downloadable CSV/PDF file. Same
// builder the generate_inventory_report MCP tool uses, so REST and MCP never drift.
export const getInventoryReportController = async (c: Context<AppEnv>) => {
  const { format } = c.get('validatedQuery') as InventoryReportQuery
  const report = await buildInventoryReport()

  if (format === 'csv') {
    const csv = toInventoryCsv(report)
    c.header('Content-Type', 'text/csv; charset=utf-8')
    c.header('Content-Disposition', `attachment; filename="${inventoryCsvFilename(report.generatedAt)}"`)
    return c.body(csv)
  }

  if (format === 'pdf') {
    const pdf = await toInventoryPdf(report)
    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', `attachment; filename="${inventoryPdfFilename(report.generatedAt)}"`)
    // Hono's c.body accepts a Uint8Array/ArrayBuffer for binary responses.
    return c.body(pdf as unknown as ArrayBuffer)
  }

  return c.json(report, 200)
}
