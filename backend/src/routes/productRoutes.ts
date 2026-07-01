import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createProductController,
  deleteProductController,
  getProduct,
  getProducts,
  updateProductController,
} from '../controllers/productController'
import { requireAuth } from '../middlewares/requireAuth'
import { uploadSingleProductImage } from '../middlewares/uploadProductImage'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '../validations/productValidation'

export const productRouter = new Hono<AppEnv>()

// Public — catalog browsing
productRouter.get('/', validateQuery(productQuerySchema), getProducts)
productRouter.get('/:id', validateParams(idParamSchema), getProduct)

// Protected — admin mutations
productRouter.post(
  '/',
  requireAuth(),
  uploadSingleProductImage,
  validateBody(createProductSchema),
  createProductController,
)
productRouter.put(
  '/:id',
  requireAuth(),
  validateParams(idParamSchema),
  uploadSingleProductImage,
  validateBody(updateProductSchema),
  updateProductController,
)
productRouter.delete('/:id', requireAuth(), validateParams(idParamSchema), deleteProductController)
