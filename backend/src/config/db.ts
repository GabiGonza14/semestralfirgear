import mongoose from 'mongoose'
import { env } from './env'
import { logger } from '../utils/logger'

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    })
    logger.info('MongoDB connected')
  } catch (error) {
    logger.error('MongoDB connection error', { error })
    throw error
  }
}
