import path from 'node:path'

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildProductImageFilename(
  productName: string,
  originalFilename: string,
  index = 0,
) {
  const extension = path.extname(originalFilename).toLowerCase() || '.jpg'
  const baseName = toSlug(productName) || 'producto'
  const timestamp = Date.now()

  return `${baseName}-${timestamp}-${index}${extension}`
}
