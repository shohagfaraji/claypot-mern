import { Router } from 'express';
import {
  addRecipe,
  create,
  list,
  memberships,
  recipes,
  remove,
  removeRecipe,
  update,
} from '../controllers/recipe-collection.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  collectionRecipeParamsSchema,
  recipeCollectionIdParamsSchema,
  recipeCollectionInputSchema,
} from '../schemas/recipe-collection.schema.js';
import { listSavedRecipesQuerySchema, recipeIdParamsSchema } from '../schemas/recipe.schema.js';

export const recipeCollectionRouter = Router();

recipeCollectionRouter.use(authenticate);
recipeCollectionRouter.get('/', list);
recipeCollectionRouter.post('/', validateBody(recipeCollectionInputSchema), create);
recipeCollectionRouter.get(
  '/memberships/:recipeId',
  validateParams(recipeIdParamsSchema),
  memberships,
);
recipeCollectionRouter.get(
  '/:collectionId/recipes',
  validateParams(recipeCollectionIdParamsSchema),
  validateQuery(listSavedRecipesQuerySchema),
  recipes,
);
recipeCollectionRouter.put(
  '/:collectionId/recipes/:recipeId',
  validateParams(collectionRecipeParamsSchema),
  addRecipe,
);
recipeCollectionRouter.delete(
  '/:collectionId/recipes/:recipeId',
  validateParams(collectionRecipeParamsSchema),
  removeRecipe,
);
recipeCollectionRouter.patch(
  '/:collectionId',
  validateParams(recipeCollectionIdParamsSchema),
  validateBody(recipeCollectionInputSchema),
  update,
);
recipeCollectionRouter.delete(
  '/:collectionId',
  validateParams(recipeCollectionIdParamsSchema),
  remove,
);
