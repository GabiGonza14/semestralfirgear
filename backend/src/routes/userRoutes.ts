import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  getUser,
  getUserByEmailController,
  getUsers,
  syncClerkUserController,
  updateUserRoleController,
  updateUserStatusController,
} from '../controllers/userController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  emailParamSchema,
  syncClerkUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validations/userValidation'

export const userRouter = new Hono<AppEnv>()

// User records are personal data — every route requires a valid Clerk JWT.
userRouter.use('*', requireAuthMiddleware())

// Browsing other users' records is an admin-only operation (RBAC): a CUSTOMER
// with a valid token still gets 403 on these reads.
userRouter.get('/', requireAdminMiddleware(), getUsers)
userRouter.get(
  '/email/:email',
  requireAdminMiddleware(),
  validateParams(emailParamSchema),
  getUserByEmailController,
)
userRouter.get('/:id', requireAdminMiddleware(), validateParams(idParamSchema), getUser)

// Admin-only account management (HU-44): change a user's role or (de)activate
// their account. The service layer additionally blocks an admin from changing
// their own role / deactivating their own account.
userRouter.patch(
  '/:id/role',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(updateUserRoleSchema),
  updateUserRoleController,
)
userRouter.patch(
  '/:id/status',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(updateUserStatusSchema),
  updateUserStatusController,
)

// sync-clerk stays available to any authenticated user — it is the login-time
// upsert that CREATES a user's own profile (and assigns their role), so it
// must NOT require an already-ADMIN role.
userRouter.post('/sync-clerk', validateBody(syncClerkUserSchema), syncClerkUserController)
