import Stripe from 'stripe'
import mongoose, { Types, type ClientSession } from 'mongoose'
import { env } from '../config/env'
import { getStripeClient } from '../config/stripe'
import { OrderEventModel } from '../models/OrderEvent'
import { OrderItemModel } from '../models/OrderItem'
import { OrderModel } from '../models/Order'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'
import { notifyAdminsOfLowStockCrossing } from './lowStockService'
import { dispatchNotification } from './notificationService'
import {
  markWebhookFailed,
  markWebhookProcessed,
  markWebhookProcessing,
  recordWebhookEvent,
  type WebhookEventData,
} from './webhookAuditService'

interface CheckoutSessionResult {
  sessionId: string
  url: string
}

interface PopulatedProductRef {
  name?: string
  images?: string[]
}

interface PopulatedOrderUserRef {
  email?: string
  role?: string
}

interface GroupedOrderItem {
  productId: string
  quantity: number
  size?: string
}

// HU-46: a product whose stock was just decremented by a paid order, carried out
// of the transaction so admins can be emailed AFTER the PENDING->PAID commit
// (never for a transaction that later aborts). `previousStock` is reconstructed
// from the post-decrement doc: the decrement is exactly `quantity`.
interface StockDecrementRecord {
  id: string
  name: string
  stock: number
  lowStockThreshold: number
  previousStock: number
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

async function assertCustomerOrder(orderId: string, session?: ClientSession) {
  const orderQuery = OrderModel.findById(orderId).populate('userId', 'email fullName role')
  const order = session ? await orderQuery.session(session) : await orderQuery

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  const userRef = order.userId as unknown as PopulatedOrderUserRef | { role?: string } | string | null

  if (typeof userRef !== 'string' && userRef?.role === 'ADMIN') {
    throw new HttpError(403, 'Admins cannot use customer checkout')
  }

  return order
}

function toStripeUnitAmount(amount: number) {
  return Math.round(amount * 100)
}

function toTaxAmount(amount: number) {
  return Math.round(amount * TAX_RATE * 100) / 100
}

function toAbsoluteImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return undefined
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl
  }

  if (imageUrl.startsWith('/')) {
    return `${env.backendUrl}${imageUrl}`
  }

  return `${env.backendUrl}/${imageUrl}`
}

export async function createCheckoutSession(orderId: string): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient()

  const order = await assertCustomerOrder(orderId)

  if (order.status === 'PAID') {
    throw new HttpError(400, 'Order is already paid')
  }

  if (order.status === 'CANCELLED') {
    throw new HttpError(400, 'Order is cancelled and cannot be paid')
  }

  await ensureOrderHasAvailableStock(order._id.toString())

  const items = await OrderItemModel.find({ orderId: order._id }).populate(
    'productId',
    'name images isActive',
  )

  if (!items.length) {
    throw new HttpError(400, 'Order has no items')
  }

  const lineItems = items.map((item) => {
    const productRef = item.productId as unknown as PopulatedProductRef | null
    const name =
      typeof item.productId === 'string'
        ? `Producto ${item.productId}`
        : productRef?.name ?? 'Producto FITGEAR'

    const images =
      typeof item.productId === 'string'
        ? []
        : (productRef?.images ?? [])
            .map((image) => toAbsoluteImageUrl(image))
            .filter((image): image is string => Boolean(image))

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(item.unitPrice),
        product_data: {
          name,
          images: images.length > 0 ? images : undefined,
        },
      },
    }
  })

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  const taxAmount = toTaxAmount(subtotal)
  const shippingAmount = subtotal > 0 ? SHIPPING_FEE : 0

  if (taxAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(taxAmount),
        product_data: {
          name: `Impuesto (${Math.round(TAX_RATE * 100)}%)`,
          images: undefined,
        },
      },
    })
  }

  if (shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(shippingAmount),
        product_data: {
          name: 'Envío',
          images: undefined,
        },
      },
    })
  }

  const userRef = order.userId as unknown as PopulatedOrderUserRef | string | null
  const customerEmail = typeof userRef === 'string' ? undefined : (userRef?.email ?? undefined)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${env.frontendUrl}/checkout/success?orderId=${order._id.toString()}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/checkout/cancel?orderId=${order._id.toString()}`,
    metadata: {
      orderId: order._id.toString(),
    },
    // Propagate orderId onto the PaymentIntent as well: Stripe does NOT copy the
    // session metadata to the PaymentIntent, and payment_intent.payment_failed
    // (HU-28) only carries the PaymentIntent — this is how we trace it back.
    payment_intent_data: {
      metadata: {
        orderId: order._id.toString(),
      },
    },
    client_reference_id: order._id.toString(),
    customer_email: customerEmail,
  })

  await OrderModel.findByIdAndUpdate(order._id, {
    stripeCheckoutSessionId: session.id,
    paymentProvider: 'STRIPE',
  })

  if (!session.url) {
    throw new HttpError(500, 'Failed to initialize Stripe checkout URL')
  }

  return {
    sessionId: session.id,
    url: session.url,
  }
}

export async function confirmCheckoutPayment(orderId: string, sessionId?: string) {
  const order = await assertCustomerOrder(orderId)

  if (order.status === 'PAID') {
    return { status: 'PAID' as const }
  }

  const resolvedSessionId = sessionId ?? order.stripeCheckoutSessionId

  if (!resolvedSessionId) {
    throw new HttpError(400, 'Missing Stripe checkout session id for this order')
  }

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(resolvedSessionId)

  const referenceOrderId = session.metadata?.orderId ?? session.client_reference_id

  if (referenceOrderId && referenceOrderId !== orderId) {
    throw new HttpError(400, 'Checkout session does not belong to this order')
  }

  const isPaid = session.payment_status === 'paid' || session.status === 'complete'

  if (!isPaid) {
    throw new HttpError(409, 'Payment is not confirmed yet')
  }

  await markOrderAsPaidAndDeductStock(
    orderId,
    session.id,
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? undefined),
  )

  return { status: 'PAID' as const }
}

// An order can only be refunded from a state where money actually changed hands.
const REFUNDABLE_STATUSES = new Set(['PAID', 'SHIPPED', 'DELIVERED'])

interface RefundOrderOptions {
  reason?: string
  actorClerkId?: string | null
}

/**
 * HU-29: refunds an order in full through the Stripe Refunds API and marks it
 * REFUNDED. Stripe is called FIRST — the order is only mutated once Stripe
 * confirms the refund, so a Stripe failure never leaves an order REFUNDED
 * without the money actually being returned (atomicity). Idempotent on the order
 * id so a double click cannot issue two refunds. Records the action in the order
 * history (OrderEvent) and emails the customer the refund detail.
 */
export async function refundOrder(orderId: string, options: RefundOrderOptions = {}) {
  const order = await OrderModel.findById(orderId).populate('userId', 'email fullName')

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  // Idempotency guard: a second attempt on an already-refunded order is a no-op
  // error, not a second Stripe refund.
  if (order.status === 'REFUNDED') {
    throw new HttpError(409, 'Order is already refunded')
  }

  if (!REFUNDABLE_STATUSES.has(order.status)) {
    throw new HttpError(400, 'Only paid, shipped or delivered orders can be refunded')
  }

  if (!order.stripePaymentIntentId) {
    throw new HttpError(400, 'Order has no Stripe payment to refund')
  }

  const stripe = getStripeClient()

  let refund: Stripe.Refund
  try {
    refund = await stripe.refunds.create(
      { payment_intent: order.stripePaymentIntentId },
      // Idempotency key scoped to the order: Stripe returns the SAME refund if
      // this is retried, so a network retry or double click never double-refunds.
      { idempotencyKey: `refund_order_${orderId}` },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[refund] Stripe refund failed', { orderId, error })
    // Atomicity: the order is left untouched so it never shows REFUNDED without
    // an actual Stripe refund behind it.
    throw new HttpError(502, `Stripe refund failed: ${message}`)
  }

  order.status = 'REFUNDED'
  order.refundedAt = new Date()
  order.stripeRefundId = refund.id
  await order.save()

  await recordRefundHistory(order, refund.id, options)
  notifyCustomerRefund(order, order.totalAmount, options.reason)

  return order
}

// Best-effort history write: the money is already back with the customer, so a
// history-log failure must not turn the request into an error. It's logged loudly
// instead. Runs on the same connection right after order.save(), so this is rare.
async function recordRefundHistory(
  order: InstanceType<typeof OrderModel>,
  stripeRefundId: string,
  options: RefundOrderOptions,
) {
  try {
    await OrderEventModel.create({
      orderId: order._id,
      type: 'REFUNDED',
      actorClerkId: options.actorClerkId ?? undefined,
      reason: options.reason,
      metadata: { stripeRefundId, amount: order.totalAmount },
    })
  } catch (error) {
    console.error('[refund] failed to write order history event', {
      orderId: order._id.toString(),
      error,
    })
  }
}

function notifyCustomerRefund(
  order: InstanceType<typeof OrderModel>,
  amount: number,
  reason?: string,
) {
  const customer = order.userId as unknown as PopulatedOrderCustomer | null
  const email = typeof order.userId === 'string' ? undefined : customer?.email

  if (!email) {
    console.warn('[refund] cannot notify: order has no customer email', {
      orderId: order._id.toString(),
    })
    return
  }

  const orderId = order._id.toString()

  dispatchNotification({
    type: 'ORDER_REFUNDED',
    to: email,
    orderId,
    subject: `Reembolso procesado — Orden #${orderId.slice(-6).toUpperCase()}`,
    html: buildRefundEmailHtml({
      name: customer?.fullName,
      orderId,
      amount,
      refundedAt: order.refundedAt ?? new Date(),
      reason,
    }),
  })
}

function buildRefundEmailHtml(params: {
  name?: string
  orderId: string
  amount: number
  refundedAt: Date
  reason?: string
}): string {
  const greeting = params.name ? `Hola ${params.name},` : 'Hola,'
  const orderNumber = params.orderId.slice(-6).toUpperCase()
  const ordersUrl = `${env.frontendUrl}/orders/${params.orderId}`
  const refundDate = params.refundedAt.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const reasonBlock = params.reason
    ? `<p style="color:#475569;"><em>Motivo: ${params.reason}</em></p>`
    : ''

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #4d7c0f;">Tu reembolso fue procesado</h2>
    <p>${greeting}</p>
    <p>Hemos procesado el reembolso de tu orden <strong>#${orderNumber}</strong>.</p>
    <p style="background:#f0fdf4; border-radius:8px; padding:12px 16px; color:#166534;">
      💳 <strong>Monto reembolsado:</strong> $${params.amount.toFixed(2)}<br/>
      📅 <strong>Fecha:</strong> ${refundDate}
    </p>
    ${reasonBlock}
    <p style="color:#475569;">El importe puede tardar unos días hábiles en reflejarse en tu método de pago,
      según tu banco.</p>
    <p style="margin: 24px 0;">
      <a href="${ordersUrl}"
         style="background:#84cc16; color:#0f172a; padding:12px 24px; border-radius:9999px;
                text-decoration:none; font-weight:bold;">Ver mi orden</a>
    </p>
    <p style="color:#94a3b8; font-size:12px;">Si tienes dudas, responde a este correo. — Equipo FITGEAR</p>
  </div>`
}

export async function constructWebhookEvent(payload: string, signature: string | undefined) {
  if (!signature) {
    console.error('[stripe-webhook] rejected event: missing Stripe signature header')
    throw new HttpError(400, 'Missing Stripe signature header')
  }

  if (!env.stripeWebhookSecret) {
    console.error('[stripe-webhook] rejected event: STRIPE_WEBHOOK_SECRET is not configured')
    throw new HttpError(500, 'Stripe webhook is not configured')
  }

  const stripe = getStripeClient()

  try {
    // constructEventAsync (not the sync constructEvent): under Bun the Stripe SDK
    // uses the Web Crypto provider, whose HMAC only works asynchronously.
    return await stripe.webhooks.constructEventAsync(payload, signature, env.stripeWebhookSecret)
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed', error)
    throw new HttpError(400, 'Invalid Stripe signature')
  }
}

export async function handleStripeEvent(event: Stripe.Event) {
  // Every received event is written to the audit log (idempotent on Stripe's
  // event id, since Stripe retries deliveries).
  let alreadyProcessed = false
  try {
    const record = await recordWebhookEvent(event, extractWebhookData(event))
    alreadyProcessed = record.alreadyProcessed
  } catch (error) {
    console.error('[stripe-webhook] failed to record audit event', { eventId: event.id, error })
  }

  // Idempotency: a redelivery of an already-processed event does no work twice.
  if (alreadyProcessed) {
    return
  }

  try {
    await markWebhookProcessing(event.id)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event)
        break
      default:
        // Received and audited, but no side effect for this event type.
        break
    }

    await markWebhookProcessed(event.id)
  } catch (error) {
    // The customer-vs-admin guard (403) is an expected skip, not a failure.
    if (error instanceof HttpError && error.statusCode === 403) {
      await markWebhookProcessed(event.id).catch(() => {})
      return
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error('[stripe-webhook] failed to process event', {
      eventId: event.id,
      type: event.type,
      error,
    })
    await markWebhookFailed(event.id, message).catch(() => {})
    throw error
  }
}

// Pulls the fields worth indexing in the audit log out of each event type.
function extractWebhookData(event: Stripe.Event): WebhookEventData {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    return {
      orderId: session.metadata?.orderId ?? session.client_reference_id ?? undefined,
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? undefined),
      customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
      amountTotal: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
      paymentStatus: session.payment_status ?? undefined,
      rawObjectType: 'checkout.session',
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    return {
      orderId: paymentIntent.metadata?.orderId ?? undefined,
      paymentIntentId: paymentIntent.id,
      customerEmail: paymentIntent.receipt_email ?? undefined,
      amountTotal: paymentIntent.amount ?? undefined,
      currency: paymentIntent.currency ?? undefined,
      paymentStatus: paymentIntent.status ?? undefined,
      rawObjectType: 'payment_intent',
    }
  }

  return { rawObjectType: (event.data.object as { object?: string }).object }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const orderId = session.metadata?.orderId ?? session.client_reference_id

  if (!orderId) {
    return
  }

  await markOrderAsPaidAndDeductStock(
    orderId,
    session.id,
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? undefined),
  )
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata?.orderId

  if (!orderId) {
    console.warn('[stripe-webhook] payment_intent.payment_failed without orderId metadata', {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  const failureReason = paymentIntent.last_payment_error?.message ?? 'El pago no pudo completarse.'
  const order = await markOrderAsFailed(orderId, paymentIntent.id, failureReason)

  if (order) {
    // Notify the customer with retry instructions — fire-and-forget so the
    // webhook response is never blocked by the email round-trip.
    notifyCustomerPaymentFailed(order, failureReason)
  }
}

interface PopulatedOrderCustomer {
  email?: string
  fullName?: string
}

async function markOrderAsFailed(orderId: string, paymentIntentId: string, reason: string) {
  const order = await OrderModel.findById(orderId).populate('userId', 'email fullName')

  if (!order) {
    console.warn('[stripe-webhook] payment failed for unknown order', { orderId })
    return null
  }

  // Only fail an order that is still awaiting payment — never clobber an order
  // that already reached PAID/SHIPPED/DELIVERED/CANCELLED/REFUNDED. Returning
  // null here also means the customer is NOT re-notified for such late events.
  if (order.status !== 'PENDING') {
    console.info('[stripe-webhook] ignoring payment_failed for non-pending order', {
      orderId,
      status: order.status,
    })
    return null
  }

  order.status = 'FAILED'
  order.paymentProvider = 'STRIPE'
  order.stripePaymentIntentId = paymentIntentId
  await order.save()

  console.info('[stripe-webhook] order marked FAILED', { orderId, paymentIntentId, reason })
  return order
}

function notifyCustomerPaymentFailed(
  order: InstanceType<typeof OrderModel>,
  reason: string,
) {
  const customer = order.userId as unknown as PopulatedOrderCustomer | null
  const email = typeof order.userId === 'string' ? undefined : customer?.email

  if (!email) {
    console.warn('[stripe-webhook] cannot notify: order has no customer email', {
      orderId: order._id.toString(),
    })
    return
  }

  const orderId = order._id.toString()

  dispatchNotification({
    type: 'PAYMENT_FAILED',
    to: email,
    orderId,
    subject: `Tu pago no se pudo procesar — Orden #${orderId.slice(-6).toUpperCase()}`,
    html: buildPaymentFailedEmailHtml({
      name: customer?.fullName,
      orderId,
      amount: order.totalAmount,
      reason,
    }),
  })
}

function buildPaymentFailedEmailHtml(params: {
  name?: string
  orderId: string
  amount: number
  reason: string
}): string {
  const retryUrl = `${env.frontendUrl}/checkout/cancel?orderId=${params.orderId}`
  const greeting = params.name ? `Hola ${params.name},` : 'Hola,'

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #b91c1c;">No pudimos procesar tu pago</h2>
    <p>${greeting}</p>
    <p>Tu pago para la orden <strong>#${params.orderId.slice(-6).toUpperCase()}</strong> por
      <strong>$${params.amount.toFixed(2)}</strong> no se pudo completar.</p>
    <p style="color:#475569;"><em>Motivo: ${params.reason}</em></p>
    <h3>¿Cómo reintentar?</h3>
    <ol style="color:#334155;">
      <li>Verifica los datos de tu tarjeta o usa otro método de pago.</li>
      <li>Asegúrate de tener fondos suficientes.</li>
      <li>Vuelve a intentar el pago desde el botón de abajo.</li>
    </ol>
    <p style="margin: 24px 0;">
      <a href="${retryUrl}"
         style="background:#84cc16; color:#0f172a; padding:12px 24px; border-radius:9999px;
                text-decoration:none; font-weight:bold;">Reintentar pago</a>
    </p>
    <p style="color:#94a3b8; font-size:12px;">Si no reconoces esta compra, ignora este correo. — Equipo FITGEAR</p>
  </div>`
}

interface ConfirmationLineItem {
  name: string
  quantity: number
  size?: string | null
  subtotal: number
}

// HU-30: loads everything the confirmation email needs (customer + line items),
// builds the template and dispatches it. Fire-and-forget via dispatchNotification
// so it never blocks the caller; all failures are logged/audited, never thrown.
// Exported for unit testing the confirmation behaviour in isolation.
export async function notifyCustomerPurchaseConfirmed(orderId: string) {
  try {
    const order = await OrderModel.findById(orderId).populate('userId', 'email fullName')

    if (!order) {
      console.warn('[stripe-webhook] cannot send confirmation: order not found', { orderId })
      return
    }

    const customer = order.userId as unknown as PopulatedOrderCustomer | null
    const email = typeof order.userId === 'string' ? undefined : customer?.email

    if (!email) {
      console.warn('[stripe-webhook] cannot send confirmation: order has no customer email', { orderId })
      return
    }

    const items = await OrderItemModel.find({ orderId: order._id }).populate('productId', 'name')
    const lineItems: ConfirmationLineItem[] = items.map((item) => {
      const product = item.productId as unknown as PopulatedProductRef | null
      return {
        name: product?.name ?? 'Producto',
        quantity: item.quantity,
        size: item.size,
        subtotal: item.subtotal,
      }
    })

    const estimatedDelivery = estimateDeliveryDate(order.paidAt ?? new Date())

    dispatchNotification({
      type: 'PURCHASE_CONFIRMATION',
      to: email,
      orderId,
      subject: `Confirmación de compra — Orden #${orderId.slice(-6).toUpperCase()}`,
      html: buildPurchaseConfirmationEmailHtml({
        name: customer?.fullName,
        orderId,
        items: lineItems,
        total: order.totalAmount,
        estimatedDelivery,
      }),
    })
  } catch (error) {
    // A confirmation-email failure must never break the payment flow itself.
    console.error('[stripe-webhook] failed to send purchase confirmation', { orderId, error })
  }
}

// Estimated delivery = paid date + 5 business days (weekends skipped). Kept
// simple: FITGEAR has no carrier integration, so this is an informational ETA.
// Exported for unit testing.
export function estimateDeliveryDate(from: Date): Date {
  const date = new Date(from)
  let added = 0
  while (added < 5) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      added++
    }
  }
  return date
}

function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildPurchaseConfirmationEmailHtml(params: {
  name?: string
  orderId: string
  items: ConfirmationLineItem[]
  total: number
  estimatedDelivery: Date
}): string {
  const greeting = params.name ? `Hola ${params.name},` : 'Hola,'
  const orderNumber = params.orderId.slice(-6).toUpperCase()
  const ordersUrl = `${env.frontendUrl}/orders/${params.orderId}`

  const rows = params.items
    .map((item) => {
      const sizeLabel = item.size ? ` <span style="color:#94a3b8;">(Talla ${item.size})</span>` : ''
      return `
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">${item.name}${sizeLabel}</td>
        <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">$${item.subtotal.toFixed(2)}</td>
      </tr>`
    })
    .join('')

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #4d7c0f;">¡Gracias por tu compra!</h2>
    <p>${greeting}</p>
    <p>Hemos recibido tu pago y tu orden <strong>#${orderNumber}</strong> está confirmada.
      Aquí tienes el resumen:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <thead>
        <tr style="color:#64748b; text-align:left; font-size:13px;">
          <th style="padding:8px 0; border-bottom:2px solid #cbd5e1;">Producto</th>
          <th style="padding:8px 0; border-bottom:2px solid #cbd5e1; text-align:center;">Cant.</th>
          <th style="padding:8px 0; border-bottom:2px solid #cbd5e1; text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 0; font-weight:bold; text-align:right;">Total</td>
          <td style="padding:12px 0; font-weight:bold; text-align:right;">$${params.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="background:#f0fdf4; border-radius:8px; padding:12px 16px; color:#166534;">
      📦 <strong>Entrega estimada:</strong> ${formatDeliveryDate(params.estimatedDelivery)}
    </p>
    <p style="margin: 24px 0;">
      <a href="${ordersUrl}"
         style="background:#84cc16; color:#0f172a; padding:12px 24px; border-radius:9999px;
                text-decoration:none; font-weight:bold;">Ver mi orden</a>
    </p>
    <p style="color:#94a3b8; font-size:12px;">Este es un correo automático de confirmación. — Equipo FITGEAR</p>
  </div>`
}

function groupOrderItems(
  items: Array<{ productId: Types.ObjectId | string; quantity: number; size?: string | null }>,
) {
  // Group by product + size so the same product in two different sizes is
  // tracked (and stock-checked) as two independent buckets.
  const grouped = new Map<string, GroupedOrderItem>()

  for (const item of items) {
    const productId =
      typeof item.productId === 'string' ? item.productId : item.productId.toString()
    const size = item.size ?? undefined
    const key = `${productId}::${size ?? ''}`
    const existing = grouped.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      grouped.set(key, { productId, quantity: item.quantity, size })
    }
  }

  return Array.from(grouped.values())
}

async function loadOrderItems(orderId: string, session?: ClientSession) {
  const itemsQuery = OrderItemModel.find({ orderId }).select('productId quantity size')
  return session ? itemsQuery.session(session) : itemsQuery
}

async function ensureOrderHasAvailableStock(orderId: string, session?: ClientSession) {
  const groupedItems = groupOrderItems(await loadOrderItems(orderId, session))

  if (!groupedItems.length) {
    throw new HttpError(400, 'Order has no items')
  }

  const uniqueProductIds = [...new Set(groupedItems.map((item) => item.productId))]
  const productIds = uniqueProductIds.map((productId) => new Types.ObjectId(productId))
  const productsQuery = ProductModel.find({ _id: { $in: productIds } }).select(
    'name stock isActive sizes',
  )
  const products = session ? await productsQuery.session(session) : await productsQuery

  if (products.length !== uniqueProductIds.length) {
    throw new HttpError(404, 'Product not found')
  }

  const productMap = new Map(products.map((product) => [product._id.toString(), product]))

  for (const item of groupedItems) {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new HttpError(404, 'Product not found')
    }

    if (!product.isActive) {
      throw new HttpError(400, 'Order has inactive products and cannot be paid')
    }

    const availableStock = item.size
      ? (product.sizes.find((size) => size.label === item.size)?.stock ?? 0)
      : product.stock

    if (availableStock < item.quantity) {
      throw new HttpError(409, `Insufficient stock for ${product.name}. Available: ${availableStock}`)
    }
  }

  return groupedItems
}

// Single-item stock update, shared by the transactional path and the
// non-replica-set fallback below — keeps the sized/non-sized branching in
// one place instead of drifting between two copies.
function decrementProductStock(item: GroupedOrderItem, session?: ClientSession) {
  const updateQuery = item.size
    ? ProductModel.findOneAndUpdate(
        {
          _id: item.productId,
          isActive: true,
          sizes: { $elemMatch: { label: item.size, stock: { $gte: item.quantity } } },
        },
        { $inc: { 'sizes.$[elem].stock': -item.quantity, stock: -item.quantity } },
        { arrayFilters: [{ 'elem.label': item.size }], new: true },
      )
    : ProductModel.findOneAndUpdate(
        { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      )

  return session ? updateQuery.session(session) : updateQuery
}

function restoreProductStock(item: GroupedOrderItem) {
  return item.size
    ? ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { 'sizes.$[elem].stock': item.quantity, stock: item.quantity } },
        { arrayFilters: [{ 'elem.label': item.size }] },
      )
    : ProductModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
}

async function applyStockDecrement(
  groupedItems: GroupedOrderItem[],
  session?: ClientSession,
): Promise<StockDecrementRecord[]> {
  const decrements: StockDecrementRecord[] = []

  for (const item of groupedItems) {
    const updated = await decrementProductStock(item, session)

    if (!updated) {
      throw new HttpError(409, 'Stock update conflict. Try again with refreshed inventory.')
    }

    decrements.push({
      id: String(updated._id),
      name: updated.name,
      stock: updated.stock,
      lowStockThreshold: updated.lowStockThreshold,
      // findOneAndUpdate decremented `stock` by exactly item.quantity, so the
      // pre-update value is the returned value plus what we just took.
      previousStock: updated.stock + item.quantity,
    })
  }

  return decrements
}

// Fires the low-stock admin alert for every product that just crossed its
// threshold downward. Called only after the PENDING->PAID transition is durably
// committed. Each notify call re-checks the crossing and no-ops otherwise, and is
// fire-and-forget, so this never blocks or breaks the payment flow.
function dispatchLowStockAlerts(decrements: StockDecrementRecord[]) {
  for (const record of decrements) {
    void notifyAdminsOfLowStockCrossing(
      {
        id: record.id,
        name: record.name,
        stock: record.stock,
        lowStockThreshold: record.lowStockThreshold,
      },
      record.previousStock,
    )
  }
}

async function markOrderAsPaidAndDeductStock(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId?: string,
) {
  await assertCustomerOrder(orderId)

  const session = await mongoose.startSession()
  let didTransitionToPaid = false
  let lowStockDecrements: StockDecrementRecord[] = []

  try {
    session.startTransaction()
    const result = await markOrderAsPaidAndDeductStockWithSession(
      orderId,
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      session,
    )
    didTransitionToPaid = result.transitioned
    lowStockDecrements = result.decrements
    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()

    if (isTransactionUnsupportedError(error)) {
      const result = await markOrderAsPaidAndDeductStockFallback(
        orderId,
        stripeCheckoutSessionId,
        stripePaymentIntentId,
      )
      didTransitionToPaid = result.transitioned
      lowStockDecrements = result.decrements
    } else {
      throw error
    }
  } finally {
    await session.endSession()
  }

  // HU-46: only after the stock decrements are durably committed, email admins
  // about any product that crossed its low-stock threshold on this order.
  if (didTransitionToPaid) {
    dispatchLowStockAlerts(lowStockDecrements)
  }

  // HU-30: send the purchase confirmation email only on the real PENDING->PAID
  // transition. Both the webhook and the confirm endpoint route through here, and
  // both early-return when the order is already PAID, so this fires exactly once.
  if (didTransitionToPaid) {
    await notifyCustomerPurchaseConfirmed(orderId)
  }
}

// Returns true when the order actually transitioned PENDING->PAID in this call
// (false when there was no order or it was already PAID), so the caller knows
// whether to send the one-time purchase confirmation email (HU-30).
async function markOrderAsPaidAndDeductStockWithSession(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId: string | undefined,
  session: ClientSession,
): Promise<{ transitioned: boolean; decrements: StockDecrementRecord[] }> {
  const orderQuery = OrderModel.findById(orderId)
  const order = await orderQuery.session(session)

  if (!order) {
    return { transitioned: false, decrements: [] }
  }

  if (order.status === 'PAID') {
    return { transitioned: false, decrements: [] }
  }

  const groupedItems = await ensureOrderHasAvailableStock(orderId, session)
  const decrements = await applyStockDecrement(groupedItems, session)

  order.status = 'PAID'
  order.paymentProvider = 'STRIPE'
  order.stripeCheckoutSessionId = stripeCheckoutSessionId
  order.stripePaymentIntentId = stripePaymentIntentId
  order.paidAt = new Date()
  await order.save({ session })

  return { transitioned: true, decrements }
}

// Same PENDING->PAID contract as the transactional path: returns true only when
// this call performed the transition (HU-30 confirmation email trigger).
async function markOrderAsPaidAndDeductStockFallback(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId?: string,
): Promise<{ transitioned: boolean; decrements: StockDecrementRecord[] }> {
  const order = await OrderModel.findById(orderId)

  if (!order) {
    return { transitioned: false, decrements: [] }
  }

  if (order.status === 'PAID') {
    return { transitioned: false, decrements: [] }
  }

  const groupedItems = await ensureOrderHasAvailableStock(orderId)
  const decremented: GroupedOrderItem[] = []
  const decrements: StockDecrementRecord[] = []

  try {
    for (const item of groupedItems) {
      const updated = await decrementProductStock(item)

      if (!updated) {
        throw new HttpError(409, 'Stock update conflict. Try again with refreshed inventory.')
      }

      decremented.push(item)
      decrements.push({
        id: String(updated._id),
        name: updated.name,
        stock: updated.stock,
        lowStockThreshold: updated.lowStockThreshold,
        previousStock: updated.stock + item.quantity,
      })
    }

    order.status = 'PAID'
    order.paymentProvider = 'STRIPE'
    order.stripeCheckoutSessionId = stripeCheckoutSessionId
    order.stripePaymentIntentId = stripePaymentIntentId
    order.paidAt = new Date()
    await order.save()

    return { transitioned: true, decrements }
  } catch (error) {
    for (const item of decremented) {
      await restoreProductStock(item)
    }

    throw error
  }
}

function isTransactionUnsupportedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes('Transaction numbers are only allowed on a replica set member') ||
    error.message.includes('Transaction numbers are only allowed on a mongos')
  )
}
