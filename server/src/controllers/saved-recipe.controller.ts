import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { ListSavedRecipesQuery, RecipeIdParams } from '../schemas/recipe.schema.js';
import {
  isRecipeSaved,
  listSavedRecipes,
  saveRecipe,
  unsaveRecipe,
} from '../services/saved-recipe.service.js';

export const listSaved: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const result = await listSavedRecipes(
    request.auth.userId,
    request.validatedQuery as ListSavedRecipesQuery,
  );

  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
    },
  });
};

export const save: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  await saveRecipe(request.auth.userId, recipeId);

  response.status(204).send();
};

export const status: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  const isSaved = await isRecipeSaved(request.auth.userId, recipeId);

  response.status(200).json({
    data: {
      isSaved,
    },
  });
};

export const unsave: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  await unsaveRecipe(request.auth.userId, recipeId);

  response.status(204).send();
};
