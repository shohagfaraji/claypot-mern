import type { RequestHandler } from 'express';
import type { ListRecipesQuery } from '../schemas/recipe.schema.js';
import type { UsernameParams } from '../schemas/user.schema.js';
import { listPublishedRecipes } from '../services/recipe.service.js';
import { getPublicUserId, getPublicUserProfile } from '../services/user-profile.service.js';

export const profile: RequestHandler = async (request, response) => {
  const { username } = request.validatedParams as UsernameParams;
  const user = await getPublicUserProfile(username);

  response.status(200).json({
    data: {
      user,
    },
  });
};

export const recipes: RequestHandler = async (request, response) => {
  const { username } = request.validatedParams as UsernameParams;
  const userId = await getPublicUserId(username);
  const result = await listPublishedRecipes(request.validatedQuery as ListRecipesQuery, userId);

  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
    },
  });
};
