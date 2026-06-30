import type { Context, Next } from 'hono'
import type { ZodType } from 'zod'
import type { AppEnv } from '../app'
import { HttpError } from '../utils/httpError'
import { isLocalProductUploadPath, removeLocalUploadFile } from '../utils/uploadPaths'

export function validateBody<T>(schema: ZodType<T>) {
  return async (c: Context<AppEnv>, next: Next) => {
    // File upload middleware may have already parsed the body into pendingBody
    const raw = c.get('pendingBody') ?? (await c.req.json().catch(() => ({})))
    const result = schema.safeParse(raw)

    if (!result.success) {
      const uploadedImagePath = (raw as Record<string, unknown>)?.imageUrl
      if (typeof uploadedImagePath === 'string' && isLocalProductUploadPath(uploadedImagePath)) {
        void removeLocalUploadFile(uploadedImagePath)
      }

      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      throw new HttpError(400, 'Validation failed', issues)
    }

    c.set('validatedBody', result.data)
    await next()
  }
}

export function validateParams<T>(schema: ZodType<T>) {
  return async (c: Context<AppEnv>, next: Next) => {
    const result = schema.safeParse(c.req.param())

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      throw new HttpError(400, 'Validation failed', issues)
    }

    c.set('validatedParams', result.data)
    await next()
  }
}

export function validateQuery<T>(schema: ZodType<T>) {
  return async (c: Context<AppEnv>, next: Next) => {
    const result = schema.safeParse(c.req.query())

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      throw new HttpError(400, 'Validation failed', issues)
    }

    c.set('validatedQuery', result.data)
    await next()
  }
}
