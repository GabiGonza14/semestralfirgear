import { unlink } from 'node:fs/promises'
import path from 'node:path'

const uploadsDirName = 'uploads'
const productsDirName = 'products'

export const uploadsRootPath = path.resolve(process.cwd(), uploadsDirName)
export const productUploadsPath = path.resolve(uploadsRootPath, productsDirName)

export function isLocalProductUploadPath(imageUrl: string) {
  return imageUrl.startsWith('/uploads/products/')
}

function resolveSafeUploadPath(imageUrl: string) {
  const relativePath = imageUrl.replace(/^\/+/, '')
  const absolutePath = path.resolve(process.cwd(), relativePath)

  if (!absolutePath.startsWith(uploadsRootPath)) {
    return null
  }

  return absolutePath
}

export async function removeLocalUploadFile(imageUrl: string) {
  const absolutePath = resolveSafeUploadPath(imageUrl)
  if (!absolutePath) {
    return
  }

  try {
    await unlink(absolutePath)
  } catch {
    // Ignore missing files and unlink errors to keep CRUD resilient.
  }
}
