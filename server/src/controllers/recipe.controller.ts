import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { CreateRecipeInput } from '../schemas/recipe.schema.js';
import { createRecipe } from '../services/recipe.service.js';

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
