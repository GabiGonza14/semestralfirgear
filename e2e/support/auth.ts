import { clerk } from '@clerk/testing/playwright'
import { test, type Page } from '@playwright/test'

// e2e/authenticated/** specs need a *real* Clerk user to sign in as — one the
// user creates themselves in the Clerk Dashboard (Users > Create user), since
// Claude never creates accounts or handles credentials (see repo safety
// rules). We only ever need the email: clerk.signIn's ticket strategy signs
// in via the Clerk Backend API without a password or touching the UI.
//
//   E2E_CUSTOMER_EMAIL - any existing Clerk user -> becomes/stays CUSTOMER
//   E2E_ADMIN_EMAIL     - MUST be exactly the email backend/src/services/
//                         userService.ts's resolveRole() hardcodes as ADMIN
//                         (see that file for the current value)
//
// Missing env var => the spec (or describe block) using it is skipped, not
// failed, so the suite stays green without secrets and CI can opt in later.
export function customerEmail(): string | undefined {
  return process.env.E2E_CUSTOMER_EMAIL
}

export function adminEmail(): string | undefined {
  return process.env.E2E_ADMIN_EMAIL
}

/** Call at the top of a `test()` body to skip when no customer test account is configured. */
export function requireCustomerAccount() {
  test.skip(!customerEmail(), 'Set E2E_CUSTOMER_EMAIL to run authenticated customer specs (see docs/e2e-testing.md).')
}

/** Call at the top of a `test()` body to skip when no admin test account is configured. */
export function requireAdminAccount() {
  test.skip(!adminEmail(), 'Set E2E_ADMIN_EMAIL to run authenticated admin specs (see docs/e2e-testing.md).')
}

// Ticket-based sign-in: no password prompt, no Clerk bot-detection UI, no
// dependency on the embedded <SignIn> form's DOM. Must be called after
// page.goto() on a page that loads Clerk (any public FITGEAR route works).
export async function signInAs(page: Page, emailAddress: string) {
  await clerk.signIn({ page, emailAddress })
}
