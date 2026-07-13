import { connectDatabase } from './config/db'
import { env } from './config/env'
import { shutdownPostHog } from './config/posthog'
import { app } from './app'
import { logger } from './utils/logger'

try {
  await connectDatabase()
} catch (error) {
  logger.error('Failed to start server', { error })
  process.exit(1)
}

Bun.serve({
  port: env.port,
  fetch: app.fetch,
})

logger.info('FITGEAR API running', { url: `http://localhost:${env.port}` })

// HU-34: flush buffered PostHog events before the process exits so captured
// errors are never lost on shutdown/restart.
let shuttingDown = false
async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  logger.info('Shutting down', { signal })
  await shutdownPostHog()
  process.exit(0)
}

process.on('SIGINT', () => void gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
