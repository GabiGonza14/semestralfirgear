import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createCategoryController,
  deleteCategoryController,
  getCategories,
  getCategory,
  updateCategoryController,
} from '../controllers/categoryController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation'

export const categoryRouter = new Hono<AppEnv>()

// Public catalog reads — no auth required.
categoryRouter.get('/', getCategories)
categoryRouter.get('/:id', validateParams(idParamSchema), getCategory)

// Admin writes — require a valid Clerk JWT AND the ADMIN role (RBAC).
categoryRouter.post(
  '/',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateBody(createCategorySchema),
  createCategoryController,
)
categoryRouter.put(
  '/:id',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  updateCategoryController,
)
categoryRouter.delete(
  '/:id',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  deleteCategoryController,
)
