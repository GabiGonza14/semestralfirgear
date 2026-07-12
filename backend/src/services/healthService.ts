import pkg from '../../package.json'
import { checkStripeReachable, isMongoConnected } from './healthChecks'

// HU-33: health/readiness. One source of truth shared by the REST endpoints
// (/api/health, /api/ready) and the run_health_check MCP tool — same pattern as
// getLowStockProducts() (HU-46).

// Read whatever version is in package.json; fall back to '0.0.0' just so the field
// is always present in the response. package.json currently has no `version` field,
// so this reads `undefined` and falls back — no versioning policy invented here
// (see #35). If a real version is added to package.json later, it flows through.
const VERSION = (pkg as { version?: string }).version ?? '0.0.0'

export interface LivenessStatus {
  status: 'OK'
  uptime: number
  version: string
}

export type DependencyState = 'up' | 'down'

export interface DependencyStatus {
  status: DependencyState
  error?: string
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready'
  uptime: number
  version: string
  dependencies: {
    mongodb: DependencyStatus
    stripe: DependencyStatus
  }
}

// Liveness (criterion 1): "the service is running" — no dependency checks.
// process.uptime() is seconds since this process started.
export function getLivenessStatus(): LivenessStatus {
  return {
    status: 'OK',
    uptime: process.uptime(),
    version: VERSION,
  }
}

// Readiness (criterion 2): ready ONLY when both MongoDB and Stripe are reachable.
// Reports per-dependency status so a caller can see which one is down.
export async function getReadinessStatus(): Promise<ReadinessStatus> {
  const [mongoConnected, stripe] = await Promise.all([
    Promise.resolve(isMongoConnected()),
    checkStripeReachable(),
  ])

  const mongodb: DependencyStatus = mongoConnected
    ? { status: 'up' }
    : { status: 'down', error: 'MongoDB connection is not established' }

  const stripeStatus: DependencyStatus = stripe.ok
    ? { status: 'up' }
    : { status: 'down', error: stripe.error }

  const ready = mongodb.status === 'up' && stripeStatus.status === 'up'

  return {
    status: ready ? 'ready' : 'not_ready',
    uptime: process.uptime(),
    version: VERSION,
    dependencies: { mongodb, stripe: stripeStatus },
  }
}
