import type { Context, Next } from 'hono'
import path from 'node:path'
import { cloudinary } from '../config/cloudinary'
import type { AppEnv } from '../app'
import { HttpError } from '../utils/httpError'
import { buildProductImageFilename } from '../utils/productImageFilename'

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

async function uploadFilesToCloudinary(files: File[], productName: string) {
  const urls: string[] = []
  const publicIds: string[] = []

  for (const [index, file] of files.entries()) {
    if (!allowedMimeTypes.has(file.type)) {
      throw new HttpError(400, 'Solo se permiten imagenes JPG, PNG, WEBP o GIF.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError(400, 'La imagen supera el tamaño máximo permitido de 5MB.')
    }

    // Cloudinary's Node SDK takes a data URI (or a stream) for direct uploads —
    // simplest option for files already capped at 5MB by the check above.
    const filename = buildProductImageFilename(productName, file.name, index)
    const publicId = path.parse(filename).name
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'products',
      public_id: publicId,
      resource_type: 'image',
    })

    urls.push(result.secure_url)
    publicIds.push(result.public_id)
  }

  return { urls, publicIds }
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
  const { urls: newImageUrls, publicIds: newImagePublicIds } = await uploadFilesToCloudinary(newFiles, productName)

  body['images'] = [...existingImages, ...newImageUrls]
  // Public IDs for the images just uploaded, in the same order — the service
  // uses these to keep Product.imagePublicIds aligned with Product.images
  // (needed later to delete the right Cloudinary asset).
  body['newImagePublicIds'] = newImagePublicIds
  // Tracked separately so a later validation failure only cleans up files this
  // request just wrote — never images the client asked to keep.
  body['newlyUploadedImagePaths'] = newImageUrls

  c.set('pendingBody', body)
  await next()
}
