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
// session — so a missing key here only skips the authenticated tier, it never
// fails the run. See docs/e2e-testing.md.
export default async function globalSetup() {
  const publishableKey = loadEnvVar('CLERK_PUBLISHABLE_KEY') ?? loadEnvVar('VITE_CLERK_PUBLISHABLE_KEY')
  const secretKey = loadEnvVar('CLERK_SECRET_KEY')

  if (!publishableKey || !secretKey) {
    console.warn(
      '[e2e] CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY not found in env or .env — ' +
        'skipping Clerk testing-token setup. Specs in e2e/authenticated/ will be skipped.',
    )
    return
  }

  process.env.CLERK_PUBLISHABLE_KEY = publishableKey
  process.env.CLERK_SECRET_KEY = secretKey

  await clerkSetup({ publishableKey, secretKey })
}
