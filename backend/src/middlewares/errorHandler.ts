import type { Context } from 'hono'
import { Error as MongooseError } from 'mongoose'
import { ZodError } from 'zod'
import type { AppEnv } from '../app'
import { HttpError } from '../utils/httpError'

// HU-35: every error response uses the envelope { error: { code, message,
// details } }. `code` is a stable, machine-readable string clients can switch on
// (not just the HTTP status restated) — derived centrally from the status so we
// don't have to thread a code through every throw-site.
const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
}

function codeForStatus(status: number): string {
  const mapped = STATUS_CODES[status]
  if (mapped) {
    return mapped
  }
  // Sensible default for any status without an explicit entry.
  return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'
}

interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Builds the standard envelope. `details` is omitted entirely when there's nothing
// more specific to say (field-level validation issues are the usual content).
function envelope(status: number, message: string, details?: unknown): ErrorEnvelope {
  return {
    error: {
      code: codeForStatus(status),
      message,
      ...(details !== undefined ? { details } : {}),
    },
  }
}

/**
 * Centralized error -> HTTP response mapper (HU-35). Recognizes HttpError,
 * ZodError, Mongoose CastError and duplicate-key (11000); everything else is an
 * unexpected 500. The full stack is captured server-side by the structured logger
 * (HU-32) and PostHog (HU-34) in app.onError — it is NEVER included in the
 * client-facing body, in any environment (criterion 4).
 */
export function buildErrorResponse(error: Error, c: Context<AppEnv>) {
  if (error instanceof HttpError) {
    return c.json(
      envelope(error.statusCode, error.message, error.errors ?? undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error.statusCode as any,
    )
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    return c.json(envelope(400, 'Validation failed', details), 400)
  }

  if (error instanceof MongooseError.CastError) {
    return c.json(
      envelope(400, 'Validation failed', [{ path: error.path, message: 'Invalid id format' }]),
      400,
    )
  }

  if ('code' in error && (error as { code?: number }).code === 11000) {
    return c.json(envelope(409, 'Resource conflict'), 409)
  }

  // Unexpected failure: 500 with a human-readable message but NEVER a stack trace
  // (criterion 4). No NODE_ENV carve-out — developers get the full stack from the
  // server-side log / PostHog, so the client body never needs to carry it.
  return c.json(envelope(500, error.message), 500)
}
