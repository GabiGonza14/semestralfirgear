import { connectDatabase } from './config/db'
import { env } from './config/env'
import { app } from './app'

try {
  await connectDatabase()
} catch (error) {
  console.error('Failed to start server', error)
  process.exit(1)
}

Bun.serve({
  port: env.port,
  fetch: app.fetch,
})

console.info(`FITGEAR API running on http://localhost:${env.port}`)
