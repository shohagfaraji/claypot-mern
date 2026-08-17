import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type {
  AdminUserIdParams,
  ListAdminRecipesQuery,
  ListAdminUsersQuery,
  UpdateAdminUserRoleInput,
} from '../schemas/admin.schema.js';
import {
  getAdminDashboard,
  listAdminRecipes,
  listAdminUsers,
  updateAdminUserRole,
} from '../services/admin.service.js';

export const showAdminDashboard: RequestHandler = async (_request, response) => {
  const dashboard = await getAdminDashboard();
  response.status(200).json({ data: { dashboard } });
};

export const listRecipesForAdmin: RequestHandler = async (request, response) => {
  const result = await listAdminRecipes(request.validatedQuery as ListAdminRecipesQuery);
  response.status(200).json({
    data: {
      recipes: result.items,
      pagination: result.pagination,
    },
  });
};

export const listUsersForAdmin: RequestHandler = async (request, response) => {
  const result = await listAdminUsers(request.validatedQuery as ListAdminUsersQuery);
  response.status(200).json({
    data: {
      users: result.items,
      pagination: result.pagination,
    },
  });
};

export const changeUserRole: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { userId } = request.validatedParams as AdminUserIdParams;
  const user = await updateAdminUserRole(
    request.auth.userId,
    userId,
    request.body as UpdateAdminUserRoleInput,
  );
  response.status(200).json({ data: { user } });
};
