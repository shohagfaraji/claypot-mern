import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { FollowUserIdParams, ListCookConnectionsQuery } from '../schemas/follow.schema.js';
import type { ListRecipesQuery } from '../schemas/recipe.schema.js';
import {
  followCook,
  getFollowStatus,
  listCookConnections,
  listFollowingFeed,
  unfollowCook,
} from '../services/follow.service.js';
import { getPublicUserId } from '../services/user-profile.service.js';
import type { UsernameParams } from '../schemas/user.schema.js';

function getAuthenticatedUserId(auth: Express.Request['auth']): string {
  if (auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  return auth.userId;
}

export const create: RequestHandler = async (request, response) => {
  const { userId } = request.validatedParams as FollowUserIdParams;
  const created = await followCook(getAuthenticatedUserId(request.auth), userId);
  response.status(created ? 201 : 200).json({ data: { following: true } });
};

export const remove: RequestHandler = async (request, response) => {
  const { userId } = request.validatedParams as FollowUserIdParams;
  await unfollowCook(getAuthenticatedUserId(request.auth), userId);
  response.status(204).send();
};

export const status: RequestHandler = async (request, response) => {
  const { userId } = request.validatedParams as FollowUserIdParams;
  const following = await getFollowStatus(getAuthenticatedUserId(request.auth), userId);
  response.status(200).json({ data: { following } });
};

export const followers: RequestHandler = async (request, response) => {
  const { username } = request.validatedParams as UsernameParams;
  const userId = await getPublicUserId(username);
  const result = await listCookConnections(
    userId,
    'followers',
    request.validatedQuery as ListCookConnectionsQuery,
  );
  response.status(200).json({
    data: { cooks: result.items, pagination: result.pagination },
  });
};

export const following: RequestHandler = async (request, response) => {
  const { username } = request.validatedParams as UsernameParams;
  const userId = await getPublicUserId(username);
  const result = await listCookConnections(
    userId,
    'following',
    request.validatedQuery as ListCookConnectionsQuery,
  );
  response.status(200).json({
    data: { cooks: result.items, pagination: result.pagination },
  });
};

export const feed: RequestHandler = async (request, response) => {
  const result = await listFollowingFeed(
    getAuthenticatedUserId(request.auth),
    request.validatedQuery as ListRecipesQuery,
  );
  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
      followingCount: result.followingCount,
    },
  });
};
