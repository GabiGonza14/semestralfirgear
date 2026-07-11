import { z } from 'zod'

// HU-52: query filters for GET /api/admin/audit. All optional — an unfiltered
// request returns the most recent records. Values arrive as query strings, so
// dates and the limit are coerced/validated here before reaching the service.
export const auditLogQuerySchema = z.object({
  // Exact action type, e.g. 'ORDER_STATUS_CHANGED'.
  action: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => (value ? value : undefined)),
  // Free-text actor match (Clerk id or email).
  actor: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  entityType: z.enum(['ORDER', 'USER', 'PRODUCT', 'CATEGORY']).optional(),
  // Inclusive date range. Accepts any Date-parseable string (e.g. an <input
  // type="date"> "YYYY-MM-DD"); an unparseable value is rejected with 400.
  dateFrom: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined))
    .refine((value) => value === undefined || !Number.isNaN(value.getTime()), {
      message: 'dateFrom must be a valid date',
    }),
  dateTo: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined))
    .refine((value) => value === undefined || !Number.isNaN(value.getTime()), {
      message: 'dateTo must be a valid date',
    }),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>
