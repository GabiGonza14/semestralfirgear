import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'
import { PRODUCT_BAND, PRODUCT_DUMBBELL, PRODUCT_SHIRT } from '../fixtures/catalog'
import { formatCurrency } from '../support/format'

// Funcionalidad: "Detalle de producto con informacion y relacionados" (README).
test.describe('Product detail page', () => {
  test('shows product info, adjusts quantity and adds to cart', async ({ page }) => {
    await mockCatalog(page)
    await page.goto(`/product/${PRODUCT_DUMBBELL._id}`)

    await expect(page.getByRole('heading', { name: PRODUCT_DUMBBELL.name })).toBeVisible()
    // The price also appears in the mobile sticky add-to-cart bar — scope to
    // the first (main) occurrence to avoid a strict-mode multi-match.
    await expect(page.getByText(formatCurrency(PRODUCT_DUMBBELL.price), { exact: true }).first()).toBeVisible()

    const qty = page.locator('span[aria-live="polite"]')
    await expect(qty).toHaveText('1')
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click()
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click()
    await expect(qty).toHaveText('3')
    await page.getByRole('button', { name: 'Disminuir cantidad' }).click()
    await expect(qty).toHaveText('2')

    await page.getByRole('button', { name: 'Agregar al carrito' }).click()

    // addItem() no longer auto-opens the drawer — open it explicitly.
    await page.getByRole('button', { name: 'Ver carrito' }).click()
    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
    const cartLine = drawer.locator('article').filter({ hasText: PRODUCT_DUMBBELL.name })
    await expect(cartLine).toBeVisible()
    await expect(cartLine.locator('span.text-center')).toHaveText('2')
  })

  test('shows a discounted price struck through against the original', async ({ page }) => {
    await mockCatalog(page)
    await page.goto(`/product/${PRODUCT_BAND._id}`)

    // Both prices also appear in the mobile sticky add-to-cart bar — scope to
    // the first (main) occurrence to avoid a strict-mode multi-match.
    await expect(page.getByText(formatCurrency(PRODUCT_BAND.finalPrice), { exact: true }).first()).toBeVisible()
    await expect(page.getByText(formatCurrency(PRODUCT_BAND.price), { exact: true }).first()).toBeVisible()
    await expect(page.getByText(`-${PRODUCT_BAND.discountPercentage}%`)).toBeVisible()
  })

  test('requires a size before it can be added to the cart', async ({ page }) => {
    await mockCatalog(page)
    await page.goto(`/product/${PRODUCT_SHIRT._id}`)

    const addButton = page.getByRole('button', { name: 'Elige una talla' })
    await expect(addButton).toBeDisabled()

    // Size "M" has 0 stock in the fixture — its chip must be disabled.
    await expect(page.getByRole('button', { name: 'M', exact: true })).toBeDisabled()

    await page.getByRole('button', { name: 'S', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled()
  })

  test('shows related products from the same category, excluding itself', async ({ page }) => {
    await mockCatalog(page)
    await page.goto(`/product/${PRODUCT_DUMBBELL._id}`)

    await expect(page.getByRole('heading', { name: 'Completa tu equipo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: PRODUCT_BAND.name })).toBeVisible()
    // Related section excludes the product being viewed.
    await expect(page.locator('section', { hasText: 'Completa tu equipo' }).getByRole('heading', { name: PRODUCT_DUMBBELL.name })).toHaveCount(0)
  })

  test('shows a not-found state for a missing product', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/product/does-not-exist')

    await expect(page.getByRole('heading', { name: 'Producto no encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Volver al catálogo' }).click()
    await expect(page).toHaveURL(/\/shop/)
  })
})
