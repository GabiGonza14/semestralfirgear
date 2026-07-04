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

// Malformed JSON, or anything that isn't an array, is treated as "no images
// kept" — validation downstream will reject the request if that leaves zero.
function parseExistingImages(raw: unknown): string[] {
  if (typeof raw !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

async function writeUploadedFiles(files: File[], productName: string) {
  const urls: string[] = []

  for (const [index, file] of files.entries()) {
    if (!allowedMimeTypes.has(file.type)) {
      throw new HttpError(400, 'Solo se permiten imagenes JPG, PNG, WEBP o GIF.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError(400, 'La imagen supera el tamaño máximo permitido de 5MB.')
    }

    const filename = buildProductImageFilename(productName, file.name, index)
    await Bun.write(path.join(productUploadsPath, filename), file)
    urls.push(`/uploads/products/${filename}`)
  }

  return urls
}

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
  const existingImages = parseExistingImages(body['existingImages'])
  delete body['existingImages']

  const newFiles = formData.getAll('images').filter((entry): entry is File => entry instanceof File)

  if (existingImages.length + newFiles.length > MAX_IMAGES) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'images', message: `A product can have at most ${MAX_IMAGES} images` },
    ])
  }

  const productName = typeof body['name'] === 'string' ? body['name'] : 'producto-fitgear'
  const newImageUrls = await writeUploadedFiles(newFiles, productName)

  body['images'] = [...existingImages, ...newImageUrls]
  // Tracked separately so a later validation failure only cleans up files this
  // request just wrote — never images the client asked to keep.
  body['newlyUploadedImagePaths'] = newImageUrls

  c.set('pendingBody', body)
  await next()
}
