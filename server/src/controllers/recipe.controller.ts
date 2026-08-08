import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type {
  CreateRecipeInput,
  ListOwnRecipesQuery,
  ListRecipesQuery,
  RecipeIdParams,
  RecipeSlugParams,
} from '../schemas/recipe.schema.js';
import {
  createRecipe,
  getPublishedRecipeBySlug,
  listAuthorRecipes,
  listPublishedRecipes,
  publishRecipe,
} from '../services/recipe.service.js';

export const list: RequestHandler = async (request, response) => {
  const result = await listPublishedRecipes(request.validatedQuery as ListRecipesQuery);

  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
    },
  });
};

export const detail: RequestHandler = async (request, response) => {
  const { slug } = request.validatedParams as RecipeSlugParams;
  const recipe = await getPublishedRecipeBySlug(slug);

  response.status(200).json({
    data: {
      recipe,
    },
  });
};

export const mine: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const result = await listAuthorRecipes(
    request.auth.userId,
    request.validatedQuery as ListOwnRecipesQuery,
  );

  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
    },
  });
};

export const create: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const recipe = await createRecipe(request.auth.userId, request.body as CreateRecipeInput);

  response.status(201).json({
    data: {
      recipe,
    },
  });
};

export const publish: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  const recipe = await publishRecipe(recipeId, request.auth);

  response.status(200).json({
    data: {
      recipe,
    },
  });
};
