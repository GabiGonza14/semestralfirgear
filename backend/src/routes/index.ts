import { Hono } from 'hono'
import type { AppEnv } from '../app'
import { adminRouter } from './adminRoutes'
import { categoryRouter } from './categoryRoutes'
import { orderRouter } from './orderRoutes'
import { paymentRouter } from './paymentRoutes'
import { productRouter } from './productRoutes'
import { reviewRouter } from './reviewRoutes'
import { userRouter } from './userRoutes'

export const apiRouter = new Hono<AppEnv>()

apiRouter.get('/health', (c) => c.json({ status: 'OK' }))

apiRouter.route('/categories', categoryRouter)
apiRouter.route('/products', productRouter)
apiRouter.route('/reviews', reviewRouter)
apiRouter.route('/users', userRouter)
apiRouter.route('/orders', orderRouter)
apiRouter.route('/payments', paymentRouter)
apiRouter.route('/admin', adminRouter)
