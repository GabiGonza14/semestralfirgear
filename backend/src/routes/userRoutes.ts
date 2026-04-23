import { Router } from 'express'
import {
	getUser,
	getUserByEmailController,
	getUsers,
	syncClerkUserController,
} from '../controllers/userController'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { emailParamSchema, syncClerkUserSchema } from '../validations/userValidation'

export const userRouter = Router()

userRouter.get('/', getUsers)
userRouter.get('/email/:email', validateParams(emailParamSchema), getUserByEmailController)
userRouter.get('/:id', validateParams(idParamSchema), getUser)
userRouter.post('/sync-clerk', validateBody(syncClerkUserSchema), syncClerkUserController)
