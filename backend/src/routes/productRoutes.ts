import { Router } from 'express'
import {
	createProductController,
	deleteProductController,
	getProduct,
	getProducts,
	updateProductController,
} from '../controllers/productController'
import {
	attachUploadedProductImagePath,
	uploadSingleProductImage,
} from '../middlewares/uploadProductImage'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
	createProductSchema,
	productQuerySchema,
	updateProductSchema,
} from '../validations/productValidation'

export const productRouter = Router()

productRouter.get('/', validateQuery(productQuerySchema), getProducts)
productRouter.get('/:id', validateParams(idParamSchema), getProduct)
productRouter.post(
	'/',
	uploadSingleProductImage,
	attachUploadedProductImagePath,
	validateBody(createProductSchema),
	createProductController,
)
productRouter.put(
	'/:id',
	validateParams(idParamSchema),
	uploadSingleProductImage,
	attachUploadedProductImagePath,
	validateBody(updateProductSchema),
	updateProductController,
)
productRouter.delete('/:id', validateParams(idParamSchema), deleteProductController)
