import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'node:path'
import { stripeWebhookController } from './controllers/paymentController'
import { buildErrorResponse } from './middlewares/errorHandler'
import { apiRouter } from './routes'
import { ensureUploadDirectories, uploadsRootPath } from './utils/uploadPaths'

export type AppVariables = {
  pendingBody?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedBody: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedParams: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatedQuery: any
  userId: string | null
}

export type AppEnv = { Variables: AppVariables }

export const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)

// Stripe webhook needs raw body — must be registered before any body parsing
app.post('/api/payments/webhook', stripeWebhookController)

// Serve uploaded files
ensureUploadDirectories()
app.get('/uploads/*', async (c) => {
  const filePath = path.resolve(process.cwd(), c.req.path.slice(1))

  if (!filePath.startsWith(uploadsRootPath)) {
    return c.notFound()
  }

  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return c.notFound()
  }

  return new Response(file)
})

app.route('/api', apiRouter)

app.notFound((c) => {
  return c.json({ message: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
})

app.onError((err, c) => {
  return buildErrorResponse(err, c)
})
