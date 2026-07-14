import { defineConfig, devices } from '@playwright/test'

// Suite E2E de FITGEAR (Punto 6 del cierre): pruebas deterministicas con
// Playwright que interactuan con la pagina real, cubriendo cada funcionalidad
// del README. La mayoria de specs (carpeta e2e/public/) stubean las
// respuestas del backend via page.route() para no depender de MongoDB/datos
// reales -> deterministicas y corribles solo con `npm run dev`.
//
// La carpeta e2e/authenticated/ prueba flujos que requieren una sesion real
// de Clerk (cuenta cliente / admin). Esas specs se saltan automaticamente
// (test.skip) si no estan seteadas E2E_CUSTOMER_EMAIL/PASSWORD o
// E2E_ADMIN_EMAIL/PASSWORD. Ver docs/e2e-testing.md.
export default defineConfig({
  testDir: './e2e',
  // `npm run start` serves the production build through TanStack Start's SSR
  // handler — a single Node process. Under several parallel workers each
  // doing full-page navigations (SSR render + client hydration) at once, that
  // process gets CPU-starved and hydration falls behind: a selectOption/click
  // can land on DOM that's rendered but not yet hydrated, so its onChange
  // never reaches React and the assertion sees stale state — a different
  // spec each run, never the same one twice, classic contention flakiness.
  // Serial execution removes that contention entirely; this suite's whole
  // point is determinism, so trading runtime for reliability is the right
  // call here.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/support/global-setup.ts',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Runs against the production build (vite build + vite preview), not `npm
  // run dev`. The Vite *dev* server's on-demand module transform + dependency
  // optimizer is flaky under Playwright's fresh, full-page navigations here:
  // TanStack Start's route-level code splitting (`?tsr-split=component`)
  // intermittently throws "Failed to fetch dynamically imported module" mid
  // navigation, which is exactly the kind of nondeterminism this suite exists
  // to avoid. The prod build has no dev-only transform/HMR machinery, so it
  // doesn't hit this class of failure — and it's what actually ships anyway.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
