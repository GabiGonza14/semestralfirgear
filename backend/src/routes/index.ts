import { Hono } from 'hono'
import type { AppEnv } from '../app'
import { healthController, readinessController } from '../controllers/healthController'
import { adminRouter } from './adminRoutes'
import { categoryRouter } from './categoryRoutes'
import { orderRouter } from './orderRoutes'
import { paymentRouter } from './paymentRoutes'
import { productRouter } from './productRoutes'
import { reviewRouter } from './reviewRoutes'
import { userRouter } from './userRoutes'

export const apiRouter = new Hono<AppEnv>()

// HU-33: public health checks (no auth). Registered directly on apiRouter — NOT
// under adminRouter — so they never inherit the requireAuth/requireAdmin chain.
// /health = liveness, /ready = readiness (MongoDB + Stripe).
apiRouter.get('/health', healthController)
apiRouter.get('/ready', readinessController)

apiRouter.route('/categories', categoryRouter)
apiRouter.route('/products', productRouter)
apiRouter.route('/reviews', reviewRouter)
apiRouter.route('/users', userRouter)
apiRouter.route('/orders', orderRouter)
apiRouter.route('/payments', paymentRouter)
apiRouter.route('/admin', adminRouter)
