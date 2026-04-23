import { connectDatabase } from './config/db'
import { env } from './config/env'
import { app } from './app'

async function bootstrap() {
  await connectDatabase()

  app.listen(env.port, () => {
    console.info(`FITGEAR API running on http://localhost:${env.port}`)
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
