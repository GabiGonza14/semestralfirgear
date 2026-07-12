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
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  // Transactional email (SendGrid). When SENDGRID_API_KEY is absent/blank the
  // email service degrades gracefully (logs instead of sending) so dev/test never
  // break. `|| undefined` normalizes the empty string Docker Compose injects for
  // an unset ${SENDGRID_API_KEY}, and `||` (not `??`) lets a blank EMAIL_FROM
  // fall back to the default sender instead of becoming an empty from-address.
  // EMAIL_FROM must be a SendGrid-verified sender (Single Sender Verification).
  sendgridApiKey: process.env.SENDGRID_API_KEY || undefined,
  emailFrom: process.env.EMAIL_FROM || 'FITGEAR <no-reply@example.com>',
  // Error monitoring / analytics (PostHog, HU-34). Optional, same graceful style
  // as SendGrid: when POSTHOG_API_KEY is absent/blank the PostHog client is not
  // created and capture calls no-op, so the server never depends on it. The
  // project API key is public by design (same key the frontend ships), so it's
  // read here without being treated as a secret. `|| undefined` normalizes the
  // empty string Docker Compose injects for an unset variable.
  posthogApiKey: process.env.POSTHOG_API_KEY || undefined,
  posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  // Cloudinary (almacenamiento de imágenes de producto, reemplaza el disco
  // local del backend). Leído de forma laxa (no requireEnv) a propósito: la
  // migración es incremental (fases 1-4) y esto no debe tumbar el arranque del
  // backend ni `bun test` para quien todavía no configuró una cuenta de
  // Cloudinary — solo falla, con un error claro, si de verdad se intenta subir
  // una imagen sin credenciales.
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || undefined,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || undefined,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || undefined,
}
