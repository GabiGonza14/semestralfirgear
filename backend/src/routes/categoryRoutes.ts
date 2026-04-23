import { Router } from 'express'
import {
	createCategoryController,
	deleteCategoryController,
	getCategories,
	getCategory,
	updateCategoryController,
} from '../controllers/categoryController'
import { validateBody, validateParams } from '../middlewares/validate'
import {
	createCategorySchema,
	updateCategorySchema,
} from '../validations/categoryValidation'
import { idParamSchema } from '../validations/commonValidation'

export const categoryRouter = Router()

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
