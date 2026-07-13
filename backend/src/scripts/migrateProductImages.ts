// One-time migration: products used to store a single `imageUrl` string.
// The schema now stores `images: string[]` (1-4 photos) instead. Run this
// once against your database after pulling the multi-image feature:
//
//   bun run migrate:images
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db'
import { ProductModel } from '../models/Product'
import { logger } from '../utils/logger'

try {
  await connectDatabase()

  const collection = ProductModel.collection
  const legacyProducts = await collection
    .find({ imageUrl: { $exists: true }, images: { $exists: false } })
    .toArray()

  logger.info('Found products with a legacy imageUrl field', { count: legacyProducts.length })

  for (const doc of legacyProducts) {
    const imageUrl = doc.imageUrl as string
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { images: [imageUrl], sizes: doc.sizes ?? [] },
        $unset: { imageUrl: '' },
      },
    )
    logger.info('Migrated product', { productId: String(doc._id) })
  }

  logger.info('Migration complete')
  await mongoose.disconnect()
} catch (error) {
  logger.error('Migration failed', { error })
  process.exit(1)
}
