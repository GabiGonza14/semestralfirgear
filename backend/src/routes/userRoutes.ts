import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  getUser,
  getUserByEmailController,
  getUsers,
  syncClerkUserController,
} from '../controllers/userController'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { emailParamSchema, syncClerkUserSchema } from '../validations/userValidation'

export const userRouter = new Hono<AppEnv>()

// User records are personal data — every route requires a valid Clerk JWT.
userRouter.use('*', requireAuthMiddleware())

userRouter.get('/', getUsers)
userRouter.get('/email/:email', validateParams(emailParamSchema), getUserByEmailController)
userRouter.get('/:id', validateParams(idParamSchema), getUser)
userRouter.post('/sync-clerk', validateBody(syncClerkUserSchema), syncClerkUserController)
