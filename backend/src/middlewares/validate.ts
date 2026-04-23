import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'
import { HttpError } from '../utils/httpError'
import { isLocalProductUploadPath, removeLocalUploadFile } from '../utils/uploadPaths'

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const uploadedImagePath = req.body?.imageUrl
      if (typeof uploadedImagePath === 'string' && isLocalProductUploadPath(uploadedImagePath)) {
        void removeLocalUploadFile(uploadedImagePath)
      }

      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return next(new HttpError(400, 'Validation failed', issues))
    }

    res.locals.validatedBody = result.data
    return next()
  }
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return next(new HttpError(400, 'Validation failed', issues))
    }

    res.locals.validatedParams = result.data
    return next()
  }
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return next(new HttpError(400, 'Validation failed', issues))
    }

    res.locals.validatedQuery = result.data
    return next()
  }
}
