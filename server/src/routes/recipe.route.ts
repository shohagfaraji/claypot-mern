import { Router } from 'express';
import {
  create,
  detail,
  list,
  mine,
  mineDetail,
  publish,
  remove,
  unpublish,
  update,
} from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  createRecipeInputSchema,
  listOwnRecipesQuerySchema,
  listRecipesQuerySchema,
  recipeIdParamsSchema,
  recipeSlugParamsSchema,
} from '../schemas/recipe.schema.js';

export const recipeRouter = Router();

recipeRouter.get('/', validateQuery(listRecipesQuerySchema), list);
recipeRouter.get('/mine', authenticate, validateQuery(listOwnRecipesQuerySchema), mine);
recipeRouter.get('/mine/:recipeId', authenticate, validateParams(recipeIdParamsSchema), mineDetail);
recipeRouter.get('/:slug', validateParams(recipeSlugParamsSchema), detail);
recipeRouter.post('/', authenticate, validateBody(createRecipeInputSchema), create);
recipeRouter.put(
  '/:recipeId',
  authenticate,
  validateParams(recipeIdParamsSchema),
  validateBody(createRecipeInputSchema),
  update,
);
recipeRouter.patch(
  '/:recipeId/publish',
  authenticate,
  validateParams(recipeIdParamsSchema),
  publish,
);
recipeRouter.patch(
  '/:recipeId/unpublish',
  authenticate,
  validateParams(recipeIdParamsSchema),
  unpublish,
);
recipeRouter.delete('/:recipeId', authenticate, validateParams(recipeIdParamsSchema), remove);
