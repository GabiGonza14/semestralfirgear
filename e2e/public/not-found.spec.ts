import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'

// Funcionalidad: 404 / ruta desconocida dentro del layout del sitio.
test('shows a 404 page for an unknown route and links back home', async ({ page }) => {
  await mockCatalog(page)
  await page.goto('/this-route-does-not-exist')

  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible()

  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page).toHaveURL(/\/$/)
})
