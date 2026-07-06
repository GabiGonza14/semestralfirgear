import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createProductController,
  deleteProductController,
  getProduct,
  getProducts,
  updateProductController,
} from '../controllers/productController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { uploadProductImages } from '../middlewares/uploadProductImage'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '../validations/productValidation'

export const productRouter = new Hono<AppEnv>()

// Public catalog reads — no auth required.
productRouter.get('/', validateQuery(productQuerySchema), getProducts)
productRouter.get('/:id', validateParams(idParamSchema), getProduct)

// Admin writes — require a valid Clerk JWT AND the ADMIN role (RBAC).
productRouter.post(
  '/',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  uploadProductImages,
  validateBody(createProductSchema),
  createProductController,
)
productRouter.put(
  '/:id',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  uploadProductImages,
  validateBody(updateProductSchema),
  updateProductController,
)
productRouter.delete(
  '/:id',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  deleteProductController,
)
