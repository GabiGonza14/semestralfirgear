import type { MiddlewareHandler } from 'hono'
import { logger } from '../utils/logger'

// HU-32: structured access log. One JSON line per request with method, path,
// response status and duration (acceptance criteria 1 & 3). Registered before the
// route handlers so it wraps everything, including 404s and errors.
//
// Deliberately logs NOTHING about headers or body — that is exactly the surface
// that would leak an `Authorization: Bearer <token>` header or a request payload
// with card data (acceptance criterion 4). hono ships `hono/logger`, but it emits
// plain text; this is a thin JSON equivalent built on the structured logger.
export function accessLog(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    await next()
    const durationMs = Date.now() - start

    logger.info('request', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    })
  }
}
