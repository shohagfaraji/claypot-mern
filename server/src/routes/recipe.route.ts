import { Router } from 'express';
import { create, detail, list } from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  createRecipeInputSchema,
  listRecipesQuerySchema,
  recipeSlugParamsSchema,
} from '../schemas/recipe.schema.js';

export const recipeRouter = Router();

recipeRouter.get('/', validateQuery(listRecipesQuerySchema), list);
recipeRouter.get('/:slug', validateParams(recipeSlugParamsSchema), detail);
recipeRouter.post('/', authenticate, validateBody(createRecipeInputSchema), create);
