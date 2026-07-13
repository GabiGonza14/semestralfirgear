import { test, expect } from '@playwright/test'
import { mockCheckout } from '../support/mockApi'
import { PRODUCT_DUMBBELL } from '../fixtures/catalog'

// Funcionalidad: "Confirmacion de pago y actualizacion de estado del pedido"
// (README) — the two pages Stripe redirects back to after checkout. These
// specs drive the pages directly by URL (as Stripe's redirect would land the
// browser), with the payment/order endpoints stubbed for determinism. Full
// "pay with a real card" coverage isn't attempted here: it would depend on
// Stripe's own hosted UI and a live account (see docs/e2e-testing.md) — this
// suite instead verifies FITGEAR's own state machine around that redirect.
test.describe('Checkout success page', () => {
  test('shows the paid state with a review shortcut once payment is confirmed', async ({ page }) => {
    await mockCheckout(page, {
      confirmPayment: 'paid',
      orders: {
        'order-paid': {
          _id: 'order-paid',
          userId: 'user-1',
          totalAmount: 89.99,
          status: 'PAID',
          createdAt: '2026-07-01T10:00:00.000Z',
          items: [
            {
              _id: 'item-1',
              // Nested object form (matches MongoOrderItem) resolves a friendly
              // productName instead of the generic "Producto" fallback.
              productId: { _id: PRODUCT_DUMBBELL._id, name: PRODUCT_DUMBBELL.name } as unknown as string,
              quantity: 1,
              unitPrice: PRODUCT_DUMBBELL.price,
              subtotal: PRODUCT_DUMBBELL.price,
            },
          ],
        },
      },
    })

    await page.goto('/checkout/success?orderId=order-paid&session_id=cs_test_123')

    await expect(page.getByRole('heading', { name: 'Gracias por tu compra' })).toBeVisible()
    await expect(page.getByText('Pago confirmado')).toBeVisible()
    await expect(page.getByText('Orden: order-paid')).toBeVisible()
    await expect(page.getByRole('link', { name: `Reseñar ${PRODUCT_DUMBBELL.name}` })).toBeVisible()

    await page.getByRole('button', { name: 'Ver mis pedidos' }).click()
    await expect(page).toHaveURL(/\/orders/)
  })

  test('shows a pending-confirmation state while Stripe is still settling', async ({ page }) => {
    await mockCheckout(page, { confirmPayment: 'pending' })

    await page.goto('/checkout/success?orderId=order-pending&session_id=cs_test_456')

    await expect(page.getByRole('heading', { name: 'Estamos validando tu pago' })).toBeVisible({
      timeout: 10_000, // the confirmation query retries a 409 up to 3x with backoff
    })
    await expect(page.getByText('Confirmando pago')).toBeVisible()
  })

  test('shows an error when the page is reached without an orderId', async ({ page }) => {
    await mockCheckout(page)
    await page.goto('/checkout/success')

    await expect(page.getByText('No se encontro la orden para confirmar el pago.')).toBeVisible()
  })
})

test.describe('Checkout cancel page', () => {
  test('offers retry/cancel for a still-pending order', async ({ page }) => {
    await mockCheckout(page, {
      orders: {
        'order-pending': {
          _id: 'order-pending',
          userId: 'user-1',
          totalAmount: 89.99,
          status: 'PENDING',
          createdAt: '2026-07-01T10:00:00.000Z',
          items: [],
        },
      },
    })

    await page.goto('/checkout/cancel?orderId=order-pending')

    await expect(page.getByRole('heading', { name: 'No se completo el pago' })).toBeVisible()
    await expect(page.getByText('Orden pendiente: order-pending')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar pago' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Cancelar orden' })).toBeEnabled()
  })

  test('disables retry/cancel once the order is no longer pending', async ({ page }) => {
    await mockCheckout(page, {
      orders: {
        'order-cancelled': {
          _id: 'order-cancelled',
          userId: 'user-1',
          totalAmount: 89.99,
          status: 'CANCELLED',
          createdAt: '2026-07-01T10:00:00.000Z',
          items: [],
        },
      },
    })

    await page.goto('/checkout/cancel?orderId=order-cancelled')

    await expect(page.getByText('Esta orden ya fue cancelada.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar pago' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Cancelar orden' })).toBeDisabled()
  })
})
