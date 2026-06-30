import type { Context } from 'hono'
import type { AppEnv } from '../app'
import {
  confirmCheckoutPayment,
  constructWebhookEvent,
  createCheckoutSession,
  handleStripeEvent,
} from '../services/paymentService'

export const createCheckoutSessionController = async (c: Context<AppEnv>) => {
  const { orderId } = c.get('validatedBody') as { orderId: string }
  const session = await createCheckoutSession(orderId)
  return c.json(session, 200)
}

export const confirmCheckoutPaymentController = async (c: Context<AppEnv>) => {
  const { orderId, sessionId } = c.get('validatedBody') as {
    orderId: string
    sessionId?: string
  }
  const result = await confirmCheckoutPayment(orderId, sessionId)
  return c.json(result, 200)
}

export const stripeWebhookController = async (c: Context<AppEnv>) => {
  const signature = c.req.header('stripe-signature')
  const rawBody = await c.req.arrayBuffer()
  const rawPayload = Buffer.from(rawBody)

  const event = await constructWebhookEvent(rawPayload, signature)
  await handleStripeEvent(event)

  return c.json({ received: true }, 200)
}
