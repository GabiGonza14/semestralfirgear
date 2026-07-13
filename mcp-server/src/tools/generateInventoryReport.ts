import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import {
  buildInventoryReport,
  type InventoryReport,
} from '../../../backend/src/services/inventoryReportService'
import { toInventoryCsv } from '../../../backend/src/utils/inventoryCsv'
import { HttpError } from '../../../backend/src/utils/httpError'

// HU-53: generate an inventory report for automated analysis or for sending to
// suppliers. Admin-only. Optionally embeds the CSV so an agent can save/attach it
// directly without a second call.
export const generateInventoryReportInputSchema = z.object({
  token: z.string().min(1, 'token is required'),
  // When true, include the ready-to-save CSV string alongside the structured data.
  includeCsv: z.boolean().optional().default(false),
})

export type GenerateInventoryReportInput = z.infer<typeof generateInventoryReportInputSchema>

export type GenerateInventoryReportResult = InventoryReport & { csv?: string }

export async function generateInventoryReportTool(
  raw: unknown,
): Promise<GenerateInventoryReportResult> {
  const input = generateInventoryReportInputSchema.parse(raw)

  // Protected admin-only tool: a valid Clerk JWT whose profile is ADMIN.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId
  const user = clerkUserId ? await UserModel.findOne({ clerkUserId }).select('role') : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  // The report is owned by the backend inventoryReportService (single source of
  // truth, shared with the REST endpoint) — the tool only adds the RBAC gate and,
  // on request, the same CSV serialization the download endpoint uses.
  const report = await buildInventoryReport()

  if (input.includeCsv) {
    return { ...report, csv: toInventoryCsv(report) }
  }

  return report
}
