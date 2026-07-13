import { z } from 'zod'
import {
  getReadinessStatus,
  type ReadinessStatus,
} from '../../../backend/src/services/healthService'

// HU-33: the FIRST public MCP tool. Unlike every other tool (which requires a
// Clerk JWT + ADMIN role), this one has NO auth and NO token input — an agent can
// probe operational health before deciding whether to run anything else. Empty
// input is valid.
export const runHealthCheckInputSchema = z.object({}).strict()

export type RunHealthCheckInput = z.infer<typeof runHealthCheckInputSchema>

export type RunHealthCheckResult = ReadinessStatus

export async function runHealthCheckTool(raw: unknown): Promise<RunHealthCheckResult> {
  // Parse (accepts empty/no args) but do NOT authenticate — this tool is public.
  runHealthCheckInputSchema.parse(raw ?? {})

  // Full readiness picture (MongoDB, Stripe, uptime, version) via the same service
  // the REST /api/ready endpoint uses — one source of truth.
  return getReadinessStatus()
}
