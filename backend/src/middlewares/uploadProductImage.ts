import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/httpError'
import { buildProductImageFilename } from '../utils/productImageFilename'
import { productUploadsPath } from '../utils/uploadPaths'

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif',
])

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, productUploadsPath)
  },
  filename: (req, file, callback) => {
    const productName = typeof req.body?.name === 'string' ? req.body.name : 'producto-fitgear'
    callback(null, buildProductImageFilename(productName, file.originalname))
  },
})

const productImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, 'Solo se permiten imagenes JPG, PNG, WEBP o GIF.'))
      return
    }

    callback(null, true)
  },
})

export const uploadSingleProductImage = productImageUpload.single('image')

export function attachUploadedProductImagePath(req: Request, _res: Response, next: NextFunction) {
  if (req.file) {
    req.body.imageUrl = `/uploads/products/${req.file.filename}`
  }

  next()
}
