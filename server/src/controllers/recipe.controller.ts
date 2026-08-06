import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { CreateRecipeInput, ListRecipesQuery } from '../schemas/recipe.schema.js';
import { createRecipe, listPublishedRecipes } from '../services/recipe.service.js';

export const list: RequestHandler = async (request, response) => {
  const result = await listPublishedRecipes(request.validatedQuery as ListRecipesQuery);

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
