import mongoose from 'mongoose'
import { env } from './env'

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    })
    console.info('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection error', error)
    throw error
  }
}
