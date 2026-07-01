import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  getUser,
  getUserByEmailController,
  getUsers,
  syncClerkUserController,
} from '../controllers/userController'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { emailParamSchema, syncClerkUserSchema } from '../validations/userValidation'

export const userRouter = new Hono<AppEnv>()

// Protected — admin user management
userRouter.get('/', requireAuth(), getUsers)
userRouter.get('/email/:email', requireAuth(), validateParams(emailParamSchema), getUserByEmailController)
userRouter.get('/:id', requireAuth(), validateParams(idParamSchema), getUser)

// Public — called by Clerk webhook during sign-up/sign-in sync
userRouter.post('/sync-clerk', validateBody(syncClerkUserSchema), syncClerkUserController)
