import type { Context, Next } from 'hono'
import path from 'node:path'
import type { AppEnv } from '../app'
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

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 4

export async function uploadProductImages(c: Context<AppEnv>, next: Next) {
  const contentType = c.req.header('content-type') ?? ''

  if (!contentType.includes('multipart/form-data')) {
    await next()
    return
  }

  const formData = await c.req.formData()

  const body: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      body[key] = value
    }
  }

  // Images the client wants to keep from a product already on file (edit flow).
  const existingImagesRaw = body['existingImages']
  delete body['existingImages']
  let existingImages: string[] = []
  if (typeof existingImagesRaw === 'string') {
    try {
      const parsed = JSON.parse(existingImagesRaw)
      if (Array.isArray(parsed)) {
        existingImages = parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      // Malformed JSON is treated as "no images kept" — validation downstream
      // will reject the request if that leaves zero images.
    }
  }

  const newFiles = formData.getAll('images').filter((entry): entry is File => entry instanceof File)

  if (existingImages.length + newFiles.length > MAX_IMAGES) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'images', message: `A product can have at most ${MAX_IMAGES} images` },
    ])
  }

  const productName = typeof body['name'] === 'string' ? body['name'] : 'producto-fitgear'
  const newImageUrls: string[] = []

  for (const [index, file] of newFiles.entries()) {
    if (!allowedMimeTypes.has(file.type)) {
      throw new HttpError(400, 'Solo se permiten imagenes JPG, PNG, WEBP o GIF.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError(400, 'La imagen supera el tamaño máximo permitido de 5MB.')
    }

    const filename = buildProductImageFilename(productName, file.name, index)
    const filePath = path.join(productUploadsPath, filename)

    await Bun.write(filePath, file)
    newImageUrls.push(`/uploads/products/${filename}`)
  }

  body['images'] = [...existingImages, ...newImageUrls]
  // Tracked separately so a later validation failure only cleans up files this
  // request just wrote — never images the client asked to keep.
  body['newlyUploadedImagePaths'] = newImageUrls

  c.set('pendingBody', body)
  await next()
}
