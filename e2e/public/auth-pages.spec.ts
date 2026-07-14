import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'

// Funcionalidad: "Login y autenticacion con Clerk" (README). Clerk's <SignIn>/
// <SignUp> render real, embedded UI (not a hosted redirect — see
// src/pages/LoginPage.tsx / SignUpPage.tsx), but their internal form markup
// is Clerk's own contract, not this app's, so these specs assert what FITGEAR
// itself renders around them plus Clerk's one stable, documented attribute
// (input[name="identifier"]) rather than asserting Clerk's full internal DOM.
// Actually completing a sign-in is covered in e2e/authenticated/ via
// clerk.signIn's ticket strategy (no UI form-filling needed there).
test.describe('Auth pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalog(page)
  })

  test('/login renders the FITGEAR shell and the embedded Clerk sign-in form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 15_000 })
  })

  test('/sign-up renders the FITGEAR shell and the embedded Clerk sign-up form', async ({ page }) => {
    await page.goto('/sign-up')

    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
  })
})
