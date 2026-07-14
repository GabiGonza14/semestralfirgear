import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'

// Funcionalidad: landing page (README "Funcionalidades principales").
test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalog(page)
  })

  test('loads and links to the shop', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/FITGEAR/i)

    // The navbar's "Tienda" link is stable and always rendered (unlike the
    // page's further-down CTA banner, which sits inside a GSAP scroll-reveal
    // section — data-reveal in src/hooks/useReveal.ts — and was flaky here
    // depending on animation/hydration timing).
    await page.getByRole('link', { name: 'Tienda' }).click()

    await expect(page).toHaveURL(/\/shop/)
  })

  test('opens the cart drawer from the navbar', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Ver carrito' }).click()

    const drawer = page.getByRole('dialog', { name: 'Carrito de compras' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Tu carrito esta vacio')).toBeVisible()
  })
})
