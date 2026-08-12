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
import { listSaved, save, status, unsave } from '../controllers/saved-recipe.controller.js';
import { create as createReview, list as listReviews } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  createRecipeInputSchema,
  listOwnRecipesQuerySchema,
  listRecipesQuerySchema,
  listSavedRecipesQuerySchema,
  recipeIdParamsSchema,
  recipeSlugParamsSchema,
} from '../schemas/recipe.schema.js';
import { createReviewInputSchema, listReviewsQuerySchema } from '../schemas/review.schema.js';

export const recipeRouter = Router();

recipeRouter.get('/', validateQuery(listRecipesQuerySchema), list);
recipeRouter.get('/mine', authenticate, validateQuery(listOwnRecipesQuerySchema), mine);
recipeRouter.get('/mine/:recipeId', authenticate, validateParams(recipeIdParamsSchema), mineDetail);
recipeRouter.get('/saved', authenticate, validateQuery(listSavedRecipesQuerySchema), listSaved);
recipeRouter.get('/:recipeId/save', authenticate, validateParams(recipeIdParamsSchema), status);
recipeRouter.get(
  '/:recipeId/reviews',
  validateParams(recipeIdParamsSchema),
  validateQuery(listReviewsQuerySchema),
  listReviews,
);
recipeRouter.get('/:slug', validateParams(recipeSlugParamsSchema), detail);
recipeRouter.post('/', authenticate, validateBody(createRecipeInputSchema), create);
recipeRouter.post(
  '/:recipeId/reviews',
  authenticate,
  validateParams(recipeIdParamsSchema),
  validateBody(createReviewInputSchema),
  createReview,
);
recipeRouter.put('/:recipeId/save', authenticate, validateParams(recipeIdParamsSchema), save);
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
recipeRouter.delete('/:recipeId/save', authenticate, validateParams(recipeIdParamsSchema), unsave);
recipeRouter.delete('/:recipeId', authenticate, validateParams(recipeIdParamsSchema), remove);
