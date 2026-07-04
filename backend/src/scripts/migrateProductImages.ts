// One-time migration: products used to store a single `imageUrl` string.
// The schema now stores `images: string[]` (1-4 photos) instead. Run this
// once against your database after pulling the multi-image feature:
//
//   bun run migrate:images
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db'
import { ProductModel } from '../models/Product'

async function migrate() {
  await connectDatabase()

  const collection = ProductModel.collection
  const legacyProducts = await collection
    .find({ imageUrl: { $exists: true }, images: { $exists: false } })
    .toArray()

  console.info(`Found ${legacyProducts.length} product(s) with a legacy imageUrl field.`)

  for (const doc of legacyProducts) {
    const imageUrl = doc.imageUrl as string
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { images: [imageUrl], sizes: doc.sizes ?? [] },
        $unset: { imageUrl: '' },
      },
    )
    console.info(`Migrated product ${doc._id}`)
  }

  console.info('Migration complete.')
  await mongoose.disconnect()
}

migrate().catch((error) => {
  console.error('Migration failed', error)
  process.exit(1)
})
