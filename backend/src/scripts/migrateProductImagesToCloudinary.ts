// One-time migration (image-storage tracking issue #145, Fase 3): uploads
// product images still sitting on the backend's local disk
// (backend/uploads/products/) to Cloudinary, and rewrites each product's
// `images`/`imagePublicIds` to point there. Handles both URL shapes images
// were ever stored as: root-relative (/uploads/products/...) and absolute
// with the backend's own host (http://localhost:4000/uploads/products/...).
// Images already on Cloudinary are left untouched. Local files are NOT
// deleted here — that's Fase 4, once this backfill is confirmed good.
//
// Writes a backup of every touched product's previous images/imagePublicIds
// to backend/cloudinary-migration-backup.json (gitignored, not part of the
// migration itself) before changing anything, so the DB state can be
// restored by hand if something looks wrong.
//
//   bun run migrate:cloudinary-images
import path from 'node:path'
import mongoose from 'mongoose'
import { cloudinary } from '../config/cloudinary'
import { connectDatabase } from '../config/db'
import { ProductModel } from '../models/Product'
import { logger } from '../utils/logger'
import { productUploadsPath, uploadsRootPath } from '../utils/uploadPaths'

const LOCAL_MARKER = '/uploads/products/'

function extractLocalFilename(imageUrl: string): string | null {
  const index = imageUrl.indexOf(LOCAL_MARKER)
  return index === -1 ? null : imageUrl.slice(index + LOCAL_MARKER.length)
}

const mimeTypesByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

interface BackupEntry {
  productId: string
  previousImages: string[]
  previousImagePublicIds: string[]
}

try {
  await connectDatabase()

  const products = await ProductModel.find({})
  const backup: BackupEntry[] = []

  let migratedImages = 0
  let alreadyOnCloudinary = 0
  let missingFiles = 0
  let unrecognizedShape = 0
  let migratedProducts = 0

  for (const product of products) {
    const images = product.images ?? []
    const publicIds = product.imagePublicIds ?? []

    const nextImages: string[] = []
    const nextPublicIds: string[] = []
    let changed = false

    for (const [index, imageUrl] of images.entries()) {
      const existingPublicId = publicIds[index] ?? ''

      if (imageUrl.includes('res.cloudinary.com')) {
        nextImages.push(imageUrl)
        nextPublicIds.push(existingPublicId)
        alreadyOnCloudinary++
        continue
      }

      const filename = extractLocalFilename(imageUrl)
      if (!filename) {
        nextImages.push(imageUrl)
        nextPublicIds.push(existingPublicId)
        unrecognizedShape++
        logger.warn('Skipping image with unrecognized URL shape', {
          productId: String(product._id),
          imageUrl,
        })
        continue
      }

      const filePath = path.join(productUploadsPath, filename)
      const localFile = Bun.file(filePath)
      if (!filePath.startsWith(uploadsRootPath) || !(await localFile.exists())) {
        nextImages.push(imageUrl)
        nextPublicIds.push(existingPublicId)
        missingFiles++
        logger.error('Local image file missing, cannot migrate', {
          productId: String(product._id),
          filePath,
        })
        continue
      }

      const publicId = path.parse(filename).name
      // A local file PATH as the upload source hits a Bun-incompatible code
      // path in the Cloudinary SDK: the first call succeeds but every call
      // after it fails with "Upload preset must be specified when using
      // unsigned upload" (config stays intact, so it's not a credentials
      // issue — reproduced in isolation). A base64 data URI — the same
      // mechanism uploadProductImage.ts uses for live uploads — doesn't hit
      // that path and has proven reliable across many sequential calls.
      const extension = path.extname(filename).toLowerCase()
      const mimeType = mimeTypesByExtension[extension] ?? 'image/jpeg'
      const buffer = Buffer.from(await localFile.arrayBuffer())
      const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'products',
        public_id: publicId,
        resource_type: 'image',
      })

      nextImages.push(result.secure_url)
      nextPublicIds.push(result.public_id)
      migratedImages++
      changed = true
      logger.info('Migrated image to Cloudinary', {
        productId: String(product._id),
        from: imageUrl,
        to: result.secure_url,
      })
    }

    if (changed) {
      backup.push({
        productId: String(product._id),
        previousImages: images,
        previousImagePublicIds: publicIds,
      })
      product.images = nextImages
      product.imagePublicIds = nextPublicIds
      await product.save()
      migratedProducts++
    }
  }

  const backupPath = path.join(process.cwd(), 'cloudinary-migration-backup.json')
  await Bun.write(backupPath, JSON.stringify(backup, null, 2))

  logger.info('Migration complete', {
    migratedProducts,
    migratedImages,
    alreadyOnCloudinary,
    missingFiles,
    unrecognizedShape,
    backupPath,
  })
  await mongoose.disconnect()
} catch (error) {
  logger.error('Migration failed', { error })
  process.exit(1)
}
