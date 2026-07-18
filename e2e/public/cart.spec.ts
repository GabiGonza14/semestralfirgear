import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'
import { PRODUCT_BAND, PRODUCT_DUMBBELL } from '../fixtures/catalog'
import { formatCurrency } from '../support/format'
import { calcCartTotals } from '../support/cartMath'

// Funcionalidad: "Carrito con ajuste de cantidades, subtotal, impuestos y
// envio" (README). Also covers order creation's guard clause (no backend
// order is created for an anonymous checkout attempt).
test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalog(page)
  })

  test('computes subtotal, tax and shipping as items are added', async ({ page }) => {
    await page.goto('/shop')
    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })

    // addItem() no longer auto-opens the drawer — adding doesn't touch the
    // drawer's open state at all, so the shop grid stays clickable and we
    // only open it once via the navbar button to check the result.
    await page
      .locator('article')
      .filter({ hasText: PRODUCT_DUMBBELL.name })
      .getByRole('button', { name: 'Agregar' })
      .click()

    const bandCard = page.locator('article').filter({ hasText: PRODUCT_BAND.name })
    await bandCard.getByRole('button', { name: 'Agregar' }).click()
    await bandCard.getByRole('button', { name: 'Agregar' }).click()

    await page.getByRole('button', { name: 'Ver carrito' }).click()
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Tu carrito (3)')).toBeVisible()

    const totals = calcCartTotals([
      { unitPrice: PRODUCT_DUMBBELL.price, quantity: 1 },
      { unitPrice: PRODUCT_BAND.finalPrice, quantity: 2 }, // discounted product uses finalPrice
    ])

    await expect(drawer.getByText('Impuesto (7%)')).toBeVisible()
    await expect(drawer.getByText(formatCurrency(totals.subtotal), { exact: true })).toBeVisible()
    await expect(drawer.getByText(formatCurrency(totals.taxAmount), { exact: true })).toBeVisible()
    await expect(drawer.getByText(formatCurrency(totals.shippingAmount), { exact: true })).toBeVisible()
    await expect(drawer.getByText(formatCurrency(totals.total), { exact: true })).toBeVisible()
  })

  test('adjusts quantity and removes an item from the drawer', async ({ page }) => {
    await page.goto('/shop')
    await page
      .locator('article')
      .filter({ hasText: PRODUCT_DUMBBELL.name })
      .getByRole('button', { name: 'Agregar' })
      .click()

    // addItem() no longer auto-opens the drawer — open it explicitly.
    await page.getByRole('button', { name: 'Ver carrito' }).click()
    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
    await expect(drawer).toBeVisible()
    const line = drawer.locator('article').filter({ hasText: PRODUCT_DUMBBELL.name })

    await line.getByRole('button', { name: 'Aumentar cantidad' }).click()
    await expect(line.locator('span.text-center')).toHaveText('2')

    await line.getByRole('button', { name: 'Eliminar del carrito' }).click()
    await expect(drawer.getByText('Tu carrito está vacío')).toBeVisible()
  })

  test('shows a login-required error when checking out while signed out', async ({ page }) => {
    await page.goto('/shop')
    await page
      .locator('article')
      .filter({ hasText: PRODUCT_DUMBBELL.name })
      .getByRole('button', { name: 'Agregar' })
      .click()

    // addItem() no longer auto-opens the drawer — open it explicitly.
    await page.getByRole('button', { name: 'Ver carrito' }).click()
    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
    await drawer.getByRole('button', { name: 'Pagar con tarjeta' }).click()

    await expect(drawer.getByText('Debes iniciar sesión para crear una orden.')).toBeVisible()
  })

  test('cart persists across a page reload', async ({ page }) => {
    await page.goto('/shop')
    await page
      .locator('article')
      .filter({ hasText: PRODUCT_DUMBBELL.name })
      .getByRole('button', { name: 'Agregar' })
      .click()

    // Reconciles the restored cart against a fresh GET /products before
    // settling — start listening before triggering the reload (registering
    // it after can race a response that's already landed by the time
    // reload()'s own 'load' wait resolves).
    const reconciled = page.waitForResponse((response) => response.url().includes('/api/products'))
    await page.reload()
    await reconciled

    await page.getByRole('button', { name: 'Ver carrito' }).click()
    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
    await expect(drawer.getByRole('heading', { name: PRODUCT_DUMBBELL.name })).toBeVisible()
  })
})
