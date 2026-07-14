import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'

// Funcionalidad: guardas de ruta (app/lib/ProtectedGuard.tsx) — un visitante
// anonimo no puede quedarse en una pagina que requiere sesion. ProtectedGuard
// confirma el estado "signed out" ~600ms antes de redirigir (evita parpadeos
// mientras Clerk resuelve), asi que estos tests esperan la URL en vez de un
// timeout corto. El panel /admin ademas nunca llega a montar
// AdminDashboardPage para un visitante no-admin (ProtectedGuard adminOnly
// devuelve null), por lo que la unica senal observable es la redireccion.
test.describe('Protected routes redirect a signed-out visitor to /login', () => {
  for (const path of ['/account', '/orders', '/admin']) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await mockCatalog(page)
      await page.goto(path)

      await page.waitForURL('**/login', { timeout: 10_000 })
      await expect(page).toHaveURL(/\/login$/)
    })
  }
})
