import { Router } from 'express';
import { profile, recipes } from '../controllers/user.controller.js';
import { validateParams, validateQuery } from '../middleware/validate-request.js';
import { listRecipesQuerySchema } from '../schemas/recipe.schema.js';
import { usernameParamsSchema } from '../schemas/user.schema.js';

export const userRouter = Router();

userRouter.get(
  '/:username/recipes',
  validateParams(usernameParamsSchema),
  validateQuery(listRecipesQuerySchema),
  recipes,
);
userRouter.get('/:username', validateParams(usernameParamsSchema), profile);
