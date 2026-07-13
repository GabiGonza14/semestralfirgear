import { env } from '../config/env'
import { NotificationLogModel } from '../models/NotificationLog'
import { logger } from '../utils/logger'

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send'
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_BACKOFF_MS = 500

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export interface NotificationInput extends EmailMessage {
  /** Business event that triggered the email, e.g. 'PAYMENT_FAILED'. */
  type: string
  orderId?: string
}

export interface RetryOptions {
  maxAttempts?: number
  baseBackoffMs?: number
}

export interface NotificationResult {
  status: 'sent' | 'failed' | 'skipped'
  attempts: number
  providerMessageId?: string
  error?: string
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Carries whether a failed attempt is worth retrying. Transient problems
// (network errors, 5xx, 429 rate-limit) are retryable; permanent client errors
// (400/403 — bad request, unverified recipient/domain) are not.
class EmailDeliveryError extends Error {
  readonly retryable: boolean
  constructor(message: string, retryable: boolean) {
    super(message)
    this.retryable = retryable
  }
}

// Parses an EMAIL_FROM of the form "Name <email>" (or a bare "email") into the
// { email, name } shape SendGrid expects.
function parseFrom(raw: string): { email: string; name?: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (match) {
    return { email: (match[2] ?? '').trim(), name: match[1]?.trim() || undefined }
  }
  return { email: raw.trim() }
}

// One delivery attempt against the SendGrid REST API. Throws on any non-2xx or
// network error so the retry loop can decide whether to try again.
async function deliverViaSendGrid(message: EmailMessage): Promise<string | undefined> {
  const from = parseFrom(env.emailFrom)

  const response = await fetch(SENDGRID_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: from.name ? { email: from.email, name: from.name } : { email: from.email },
      subject: message.subject,
      // SendGrid requires content ordered by increasing preference: plain first.
      content: [
        ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
        { type: 'text/html', value: message.html },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    // Retry only transient failures — a permanent 4xx would just fail again.
    const retryable = response.status >= 500 || response.status === 429
    throw new EmailDeliveryError(
      `SendGrid responded ${response.status}: ${body.slice(0, 300)}`,
      retryable,
    )
  }

  // SendGrid returns 202 Accepted with an empty body; the id is in a header.
  return response.headers.get('X-Message-Id') ?? undefined
}

// Audit writes are best-effort — they must never break the email flow itself.
async function safeUpdateLog(logId: string, update: Record<string, unknown>) {
  try {
    await NotificationLogModel.findByIdAndUpdate(logId, update)
  } catch (error) {
    logger.error('[notification] failed to update audit log', { logId, error })
  }
}

// Creates the up-front audit record so a crash mid-send still leaves a trace.
// Best-effort: returns the log id, or undefined if the write failed.
async function createAuditLog(input: NotificationInput): Promise<string | undefined> {
  try {
    const log = await NotificationLogModel.create({
      type: input.type,
      channel: 'EMAIL',
      to: input.to,
      subject: input.subject,
      status: 'pending',
      attempts: 0,
      orderId: input.orderId,
    })
    return log.id
  } catch (error) {
    logger.error('[notification] failed to create audit log', { error })
    return undefined
  }
}

// Runs the at-most-`maxAttempts` retry loop with exponential backoff and returns
// the final outcome. Retries only transient failures; a permanent 4xx stops
// early. Does not touch the audit log — the caller records the result.
async function attemptDelivery(
  input: NotificationInput,
  maxAttempts: number,
  baseBackoffMs: number,
): Promise<NotificationResult> {
  let lastError: string | undefined
  let attemptsMade = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsMade = attempt
    try {
      const providerMessageId = await deliverViaSendGrid(input)
      return { status: 'sent', attempts: attempt, providerMessageId }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      const retryable = !(error instanceof EmailDeliveryError) || error.retryable
      logger.error('[notification] delivery attempt failed', {
        attempt,
        maxAttempts,
        subject: input.subject,
        recipient: input.to,
        error: lastError,
      })

      // Stop early on permanent failures; otherwise back off before retrying.
      if (!retryable) break
      if (attempt < maxAttempts) {
        await delay(baseBackoffMs * 2 ** (attempt - 1))
      }
    }
  }

  return { status: 'failed', attempts: attemptsMade, error: lastError }
}

/**
 * Sends a transactional email with an at-most-`maxAttempts` retry loop using
 * exponential backoff, and records the outcome in the NotificationLog audit
 * trail. Graceful fallback: when SENDGRID_API_KEY is not configured the email is
 * logged and recorded as `skipped` (never throws) so dev/test keep working.
 *
 * Prefer `dispatchNotification` from request/webhook handlers so the send never
 * blocks the HTTP response.
 */
export async function sendNotification(
  input: NotificationInput,
  options: RetryOptions = {},
): Promise<NotificationResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS

  const logId = await createAuditLog(input)

  // Graceful fallback — no provider key configured.
  if (!env.sendgridApiKey) {
    logger.warn('[notification] SENDGRID_API_KEY missing — email NOT sent (dev fallback)', {
      subject: input.subject,
      recipient: input.to,
    })
    if (logId) await safeUpdateLog(logId, { status: 'skipped', attempts: 0 })
    return { status: 'skipped', attempts: 0 }
  }

  const result = await attemptDelivery(input, maxAttempts, baseBackoffMs)

  if (logId) {
    await safeUpdateLog(
      logId,
      result.status === 'sent'
        ? {
            status: 'sent',
            attempts: result.attempts,
            sentAt: new Date(),
            providerMessageId: result.providerMessageId,
            lastError: undefined,
          }
        : { status: 'failed', attempts: result.attempts, lastError: result.error },
    )
  }

  return result
}

/**
 * Fire-and-forget wrapper for request/webhook paths: dispatches the send in the
 * background so it never blocks the HTTP response (the "async, non-blocking"
 * acceptance criterion). Failures are logged and audited, never thrown.
 */
export function dispatchNotification(input: NotificationInput, options: RetryOptions = {}): void {
  void sendNotification(input, options).catch((error) => {
    logger.error('[notification] unexpected dispatch failure', { error })
  })
}
