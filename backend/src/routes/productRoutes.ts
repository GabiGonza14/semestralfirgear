import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createProductController,
  deleteProductController,
  getProduct,
  getProducts,
  updateProductController,
} from '../controllers/productController'
import { uploadProductImages } from '../middlewares/uploadProductImage'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '../validations/productValidation'

export const productRouter = new Hono<AppEnv>()

productRouter.get('/', validateQuery(productQuerySchema), getProducts)
productRouter.get('/:id', validateParams(idParamSchema), getProduct)
productRouter.post(
  '/',
  uploadProductImages,
  validateBody(createProductSchema),
  createProductController,
)
productRouter.put(
  '/:id',
  validateParams(idParamSchema),
  uploadProductImages,
  validateBody(updateProductSchema),
  updateProductController,
)
productRouter.delete('/:id', validateParams(idParamSchema), deleteProductController)
