import { Router } from 'express'
import { categoryRouter } from './categoryRoutes'
import { productRouter } from './productRoutes'
import { userRouter } from './userRoutes'
import { orderRouter } from './orderRoutes'
import { paymentRouter } from './paymentRoutes'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'OK' })
})

apiRouter.use('/categories', categoryRouter)
apiRouter.use('/products', productRouter)
apiRouter.use('/users', userRouter)
apiRouter.use('/orders', orderRouter)
apiRouter.use('/payments', paymentRouter)
