import { test, expect } from '@playwright/test'
import { requireAdminAccount, adminEmail, signInAs } from '../support/auth'

// Funcionalidad: "Panel de administracion para catalogo, usuarios y
// pedidos", "Alertas de stock bajo", "Historial de auditoria", "Reporte de
// inventario exportable en CSV y PDF" (README). Runs against the real
// backend/MongoDB, like customer-flow.spec.ts — there's no meaningful way to
// mock "is this Clerk account an admin" without the real backend's
// email-based role resolution (backend/src/services/userService.ts).
//
// Requires E2E_ADMIN_EMAIL to be the exact email that resolves to ADMIN in
// resolveRole() there. Skips (not fails) when unset. See docs/e2e-testing.md.
test.describe('Admin panel', () => {
  test.beforeEach(async ({ page }) => {
    requireAdminAccount()
    await page.goto('/')
    await signInAs(page, adminEmail()!)
    await page.goto('/admin')
    // ProtectedGuard withholds AdminDashboardPage until isAdmin resolves true.
    await expect(page.getByRole('heading', { name: 'Administración de FITGEAR' })).toBeVisible({ timeout: 15_000 })
  })

  test('navigates every sidebar section without error', async ({ page }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))

    for (const label of ['Resumen', 'Inventario', 'Categorías', 'Órdenes', 'Usuarios', 'Reseñas', 'Auditoría']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      // No client-side routing between sections — give React a beat to render.
      await page.waitForTimeout(150)
    }

    expect(pageErrors).toEqual([])
  })

  test('inventory section renders product management and export controls', async ({ page }) => {
    await page.getByRole('button', { name: 'Inventario', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Gestión de productos' })).toBeVisible()
  })

  test('categories section renders category management', async ({ page }) => {
    await page.getByRole('button', { name: 'Categorías', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Gestión de categorías' })).toBeVisible()
  })

  test('orders section renders the orders table', async ({ page }) => {
    await page.getByRole('button', { name: 'Órdenes', exact: true }).click()
    await expect(page.getByText('Cliente', { exact: true })).toBeVisible()
    await expect(page.getByText('Estado', { exact: true }).first()).toBeVisible()
  })

  test('users section renders the users table with the signed-in admin listed', async ({ page }) => {
    await page.getByRole('button', { name: 'Usuarios', exact: true }).click()
    await expect(page.getByText('Email', { exact: true })).toBeVisible()
    // The admin's own email also shows in the sidebar user-menu widget —
    // scope to the table cell to avoid a strict-mode multi-match there.
    await expect(page.getByRole('cell', { name: adminEmail()! })).toBeVisible()
  })

  test('reviews moderation section renders its status filters', async ({ page }) => {
    await page.getByRole('button', { name: 'Reseñas', exact: true }).click()
    for (const label of ['Pendientes', 'Aprobadas', 'Rechazadas', 'Ocultas', 'Todas']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })

  test('audit log section renders the admin action history', async ({ page }) => {
    await page.getByRole('button', { name: 'Auditoría', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Historial de acciones admin' })).toBeVisible()
  })

  test('inventory report can be exported as CSV', async ({ page }) => {
    await page.getByRole('button', { name: 'Inventario', exact: true }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /CSV/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.csv$/i)
  })
})
