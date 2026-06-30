import type { Context } from 'hono'
import { Error as MongooseError } from 'mongoose'
import { ZodError } from 'zod'
import type { AppEnv } from '../app'
import { HttpError } from '../utils/httpError'

export function buildErrorResponse(error: Error, c: Context<AppEnv>) {
  if (error instanceof HttpError) {
    return c.json(
      { message: error.message, ...(error.errors ? { errors: error.errors } : {}) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error.statusCode as any,
    )
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      400,
    )
  }

  if (error instanceof MongooseError.CastError) {
    return c.json(
      {
        message: 'Validation failed',
        errors: [{ path: error.path, message: 'Invalid id format' }],
      },
      400,
    )
  }

  if ('code' in error && (error as { code?: number }).code === 11000) {
    return c.json({ message: 'Resource conflict' }, 409)
  }

  return c.json(
    {
      message: error.message,
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack }),
    },
    500,
  )
}
