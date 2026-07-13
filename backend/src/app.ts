import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './config/env'
import { capturePostHogException } from './config/posthog'
import { stripeWebhookController } from './controllers/paymentController'
import { accessLog } from './middlewares/accessLog'
import { buildErrorResponse } from './middlewares/errorHandler'
import { apiRouter } from './routes'
import { logger } from './utils/logger'

export type AppVariables = {
  pendingBody?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedBody: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedParams: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedQuery: any
  userId: string | null
  userRole: 'ADMIN' | 'CUSTOMER'
}

export type AppEnv = { Variables: AppVariables }

export const app = new Hono<AppEnv>()

// Structured access log first, so every request — including 404s and errors — gets
// exactly one request line with method/path/status/duration.
app.use('*', accessLog())

app.use(
  '*',
  cors({
    // Was hardcoded to the old Vite SPA port (5173); TanStack Start now serves
    // the frontend on 3000. Derive from FRONTEND_URL (see config/env.ts) so
    // this doesn't drift from the actual frontend port again.
    origin: [env.frontendUrl, env.frontendUrl.replace('localhost', '127.0.0.1')],
    credentials: true,
  }),
)

// Stripe webhook needs raw body — must be registered before any body parsing
app.post('/api/payments/webhook', stripeWebhookController)

app.route('/api', apiRouter)

app.notFound((c) => {
  return c.json({ message: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
})

app.onError((err, c) => {
  // Acceptance criterion 2: an unhandled error must leave a server-side trace with
  // the full stack. buildErrorResponse only shapes the CLIENT response (and hides
  // the stack in prod) — it never logs. Log here, structured, before responding.
  // The logger serializes the Error to { name, message, stack }.
  logger.error('unhandled error', {
    method: c.req.method,
    path: c.req.path,
    error: err,
  })
  // HU-34: also send to PostHog Error Tracking (cloud alerting), complementary to
  // the local structured log above. userId is populated by the auth middleware on
  // protected routes, null on public ones. Context is sanitized inside the helper.
  capturePostHogException(err, {
    method: c.req.method,
    path: c.req.path,
    userId: c.get('userId'),
  })
  return buildErrorResponse(err, c)
})
