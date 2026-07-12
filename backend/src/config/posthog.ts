import { PostHog } from 'posthog-node'
import { env } from './env'
import { logger, sanitizeContext } from '../utils/logger'

// HU-34: backend PostHog client. Lazy singleton like getStripeClient(), but
// GRACEFUL like the SendGrid handling: when POSTHOG_API_KEY is not configured this
// returns null and every capture no-ops, so a missing key never crashes the
// server.

let posthogClient: PostHog | null = null
let disabledLogged = false

export function getPostHogClient(): PostHog | null {
  if (!env.posthogApiKey) {
    if (!disabledLogged) {
      logger.warn('[posthog] POSTHOG_API_KEY missing — error monitoring disabled')
      disabledLogged = true
    }
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(env.posthogApiKey, {
      host: env.posthogHost,
    })
  }

  return posthogClient
}

export interface BackendExceptionContext {
  method?: string
  path?: string
  // Populated by the auth middleware on protected routes; null on public ones.
  userId?: string | null
}

// Sends an exception to PostHog Error Tracking with request context. Reuses the
// structured logger's sanitizeContext (HU-32) so request-derived values (notably
// `path`) are stripped of control chars and any sensitive keys are redacted before
// reaching this third-party sink — PostHog capture is a NEW sink and must not leak
// what the local logs were already hardened against. Best-effort: never throws
// back into the request path.
export function capturePostHogException(error: unknown, context: BackendExceptionContext): void {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    const sanitized = sanitizeContext({
      method: context.method,
      path: context.path,
    })
    // PostHog associates the event with a user via distinctId. Fall back to a
    // fixed anonymous id for public routes so backend errors still group.
    const distinctId = context.userId ?? 'backend-anonymous'

    client.captureException(error, distinctId, sanitized)
  } catch (captureError) {
    logger.error('[posthog] failed to capture exception', { error: captureError })
  }
}

// Flush pending events and stop the background timer so the process can exit
// cleanly without losing buffered captures.
export async function shutdownPostHog(): Promise<void> {
  if (!posthogClient) {
    return
  }
  try {
    await posthogClient.shutdown()
  } catch (error) {
    logger.error('[posthog] failed to shut down cleanly', { error })
  }
}
