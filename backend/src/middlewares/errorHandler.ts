import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { Error as MongooseError } from 'mongoose'
import { ZodError } from 'zod'
import { HttpError } from '../utils/httpError'

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    })
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  if (error instanceof MongooseError.CastError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: [{ path: error.path, message: 'Invalid id format' }],
    })
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'La imagen supera el tamaño máximo permitido de 5MB.',
      })
    }

    return res.status(400).json({
      message: 'Error al procesar la imagen.',
    })
  }

  if ('code' in error && (error as { code?: number }).code === 11000) {
    return res.status(409).json({
      message: 'Resource conflict',
    })
  }

  const statusCode = res.statusCode >= 400 ? res.statusCode : 500

  res.status(statusCode).json({
    message: error.message,
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack }),
  })
}
