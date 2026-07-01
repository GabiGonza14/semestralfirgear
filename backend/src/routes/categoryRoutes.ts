import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createCategoryController,
  deleteCategoryController,
  getCategories,
  getCategory,
  updateCategoryController,
} from '../controllers/categoryController'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation'

export const categoryRouter = new Hono<AppEnv>()

categoryRouter.get('/', getCategories)
categoryRouter.get('/:id', validateParams(idParamSchema), getCategory)
categoryRouter.post('/', validateBody(createCategorySchema), createCategoryController)
categoryRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  updateCategoryController,
)
categoryRouter.delete('/:id', validateParams(idParamSchema), deleteCategoryController)
