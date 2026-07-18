import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clerkSetup } from '@clerk/testing/playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Reads a var from process.env, falling back to the root .env file (Playwright's
// Node process doesn't auto-load it the way Vite does for the frontend).
function loadEnvVar(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name]
  }

  const envPath = resolve(__dirname, '../../.env')
  if (!existsSync(envPath)) {
    return undefined
  }

  const line = readFileSync(envPath, 'utf-8')
    .split('\n')
    .find((entry) => entry.trim().startsWith(`${name}=`))

  return line?.slice(name.length + 1).trim()
}

// Fetches Clerk's testing token once for the whole run so e2e/authenticated/**
// specs can sign in deterministically via clerk.signIn({ page, emailAddress })
// (ticket-based, no password/UI interaction, no bot-detection prompts). Public
// specs under e2e/public/** don't need this — they never touch a real Clerk
// session — so this is skipped whenever no test account is configured, it
// never fails the run. See docs/e2e-testing.md.
//
// Gated on E2E_ADMIN_EMAIL/E2E_CUSTOMER_EMAIL (not just the Clerk API keys):
// the app itself needs *a* CLERK_SECRET_KEY present just to let its SSR
// middleware boot (@clerk/tanstack-react-start throws "no secret key
// provided" otherwise) — that's true even for e2e/public, and even a
// syntactically-fake key satisfies it. But clerkSetup() below makes a real
// call to Clerk's Backend API to mint a testing token, which needs a *valid*
// key. Without a configured test account, no spec calls clerk.signIn() and
// that token is never used — so skip the real API call entirely rather than
// fail the whole suite on an intentionally-fake CI key.
export default async function globalSetup() {
  const publishableKey = loadEnvVar('CLERK_PUBLISHABLE_KEY') ?? loadEnvVar('VITE_CLERK_PUBLISHABLE_KEY')
  const secretKey = loadEnvVar('CLERK_SECRET_KEY')
  const hasTestAccount = Boolean(loadEnvVar('E2E_ADMIN_EMAIL') || loadEnvVar('E2E_CUSTOMER_EMAIL'))

  if (!publishableKey || !secretKey || !hasTestAccount) {
    console.warn(
      '[e2e] E2E_ADMIN_EMAIL/E2E_CUSTOMER_EMAIL not set — ' +
        'skipping Clerk testing-token setup. Specs in e2e/authenticated/ will be skipped.',
    )
    return
  }

  process.env.CLERK_PUBLISHABLE_KEY = publishableKey
  process.env.CLERK_SECRET_KEY = secretKey

  await clerkSetup({ publishableKey, secretKey })
}
