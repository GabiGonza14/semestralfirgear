import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { getLivenessStatus, getReadinessStatus } from '../services/healthService'

// HU-33: liveness — 200 whenever the process is up, no dependency checks.
export const healthController = (c: Context<AppEnv>) => {
  return c.json(getLivenessStatus(), 200)
}

// HU-33: readiness — 200 only when MongoDB AND Stripe are reachable, else 503 with
// the per-dependency breakdown so a caller can see which one is down.
export const readinessController = async (c: Context<AppEnv>) => {
  const readiness = await getReadinessStatus()
  return c.json(readiness, readiness.status === 'ready' ? 200 : 503)
}
