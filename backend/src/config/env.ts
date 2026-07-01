import dotenv from 'dotenv'

dotenv.config()

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: requireEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/fitgear'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
}
