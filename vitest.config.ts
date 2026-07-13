import { defineConfig } from 'vitest/config'

// The frontend uses vitest; the backend and mcp-server have their own suites
// written for `bun test` (`import ... from 'bun:test'`), which vitest cannot run.
// Scope vitest to `src/` so `npm test` only picks up the frontend tests.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
