import { Router } from 'express';
import { create, list } from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateQuery } from '../middleware/validate-request.js';
import { createRecipeInputSchema, listRecipesQuerySchema } from '../schemas/recipe.schema.js';

export const recipeRouter = Router();

recipeRouter.get('/', validateQuery(listRecipesQuerySchema), list);
recipeRouter.post('/', authenticate, validateBody(createRecipeInputSchema), create);
