import type { RequestHandler } from 'express';
import type { ListAdminRecipesQuery, ListAdminUsersQuery } from '../schemas/admin.schema.js';
import { getAdminDashboard, listAdminRecipes, listAdminUsers } from '../services/admin.service.js';

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
