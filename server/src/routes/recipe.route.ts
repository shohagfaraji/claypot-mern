import { Router } from 'express';
import { create } from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate-request.js';
import { createRecipeInputSchema } from '../schemas/recipe.schema.js';

export const recipeRouter = Router();

recipeRouter.post('/', authenticate, validateBody(createRecipeInputSchema), create);
