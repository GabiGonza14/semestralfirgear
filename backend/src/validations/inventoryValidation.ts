import { z } from 'zod'

// HU-53: query for GET /api/admin/inventory-report. `format` selects the
// response representation — JSON (default, for the panel and agents), CSV or PDF
// (downloadable files). Arrives as a query string.
export const inventoryReportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
})

export type InventoryReportQuery = z.infer<typeof inventoryReportQuerySchema>
