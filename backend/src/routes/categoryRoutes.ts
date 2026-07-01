import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createCategoryController,
  deleteCategoryController,
  getCategories,
  getCategory,
  updateCategoryController,
} from '../controllers/categoryController'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation'

export const categoryRouter = new Hono<AppEnv>()

// Public — catalog browsing
categoryRouter.get('/', getCategories)
categoryRouter.get('/:id', validateParams(idParamSchema), getCategory)

// Protected — admin mutations
categoryRouter.post('/', requireAuth(), validateBody(createCategorySchema), createCategoryController)
categoryRouter.put(
  '/:id',
  requireAuth(),
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  updateCategoryController,
)
categoryRouter.delete('/:id', requireAuth(), validateParams(idParamSchema), deleteCategoryController)
