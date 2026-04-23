import cors from 'cors'
import express from 'express'
import { stripeWebhookController } from './controllers/paymentController'
import { errorHandler } from './middlewares/errorHandler'
import { notFound } from './middlewares/notFound'
import { apiRouter } from './routes'
import { ensureUploadDirectories, uploadsRootPath } from './utils/uploadPaths'

export const app = express()

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookController)
app.use(express.json())
ensureUploadDirectories()
app.use('/uploads', express.static(uploadsRootPath))

app.use('/api', apiRouter)

app.use(notFound)
app.use(errorHandler)
