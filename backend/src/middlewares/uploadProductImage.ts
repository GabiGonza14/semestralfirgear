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

export async function uploadSingleProductImage(c: Context<AppEnv>, next: Next) {
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

  const file = formData.get('image')

  if (file instanceof File) {
    if (!allowedMimeTypes.has(file.type)) {
      throw new HttpError(400, 'Solo se permiten imagenes JPG, PNG, WEBP o GIF.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpError(400, 'La imagen supera el tamaño máximo permitido de 5MB.')
    }

    const productName = typeof body['name'] === 'string' ? body['name'] : 'producto-fitgear'
    const filename = buildProductImageFilename(productName, file.name)
    const filePath = path.join(productUploadsPath, filename)

    await Bun.write(filePath, file)
    body['imageUrl'] = `/uploads/products/${filename}`
  }

  c.set('pendingBody', body)
  await next()
}
