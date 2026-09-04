import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type {
  CollectionRecipeParams,
  RecipeCollectionIdParams,
  RecipeCollectionInput,
} from '../schemas/recipe-collection.schema.js';
import type { ListSavedRecipesQuery, RecipeIdParams } from '../schemas/recipe.schema.js';
import {
  addRecipeToCollection,
  createRecipeCollection,
  deleteRecipeCollection,
  listCollectionRecipes,
  listRecipeCollectionMemberships,
  listRecipeCollections,
  removeRecipeFromCollection,
  updateRecipeCollection,
} from '../services/recipe-collection.service.js';

function authenticatedUserId(auth: Express.Request['auth']): string {
  if (auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return auth.userId;
}

export const list: RequestHandler = async (request, response) => {
  const collections = await listRecipeCollections(authenticatedUserId(request.auth));
  response.status(200).json({ data: { collections } });
};

export const create: RequestHandler = async (request, response) => {
  const collection = await createRecipeCollection(
    authenticatedUserId(request.auth),
    request.body as RecipeCollectionInput,
  );
  response.status(201).json({ data: { collection } });
};

export const update: RequestHandler = async (request, response) => {
  const { collectionId } = request.validatedParams as RecipeCollectionIdParams;
  const collection = await updateRecipeCollection(
    authenticatedUserId(request.auth),
    collectionId,
    request.body as RecipeCollectionInput,
  );
  response.status(200).json({ data: { collection } });
};

export const remove: RequestHandler = async (request, response) => {
  const { collectionId } = request.validatedParams as RecipeCollectionIdParams;
  await deleteRecipeCollection(authenticatedUserId(request.auth), collectionId);
  response.status(204).send();
};

export const recipes: RequestHandler = async (request, response) => {
  const { collectionId } = request.validatedParams as RecipeCollectionIdParams;
  const result = await listCollectionRecipes(
    authenticatedUserId(request.auth),
    collectionId,
    request.validatedQuery as ListSavedRecipesQuery,
  );
  response.status(200).json({
    data: {
      collection: result.collection,
      recipes: result.recipes.items,
      pagination: result.recipes.pagination,
    },
  });
};

export const addRecipe: RequestHandler = async (request, response) => {
  const { collectionId, recipeId } = request.validatedParams as CollectionRecipeParams;
  await addRecipeToCollection(authenticatedUserId(request.auth), collectionId, recipeId);
  response.status(204).send();
};

export const removeRecipe: RequestHandler = async (request, response) => {
  const { collectionId, recipeId } = request.validatedParams as CollectionRecipeParams;
  await removeRecipeFromCollection(authenticatedUserId(request.auth), collectionId, recipeId);
  response.status(204).send();
};

export const memberships: RequestHandler = async (request, response) => {
  const { recipeId } = request.validatedParams as RecipeIdParams;
  const collections = await listRecipeCollectionMemberships(
    authenticatedUserId(request.auth),
    recipeId,
  );
  response.status(200).json({ data: { collections } });
};
