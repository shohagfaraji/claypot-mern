import { z } from 'zod';
import { recipeStatuses } from '../models/recipe.model.js';
import { userRoles } from '../models/user.model.js';

const adminSearchSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(100, 'Search cannot exceed 100 characters.').optional(),
);

export const listAdminRecipesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: adminSearchSchema,
  status: z.enum(recipeStatuses).optional(),
  sort: z.enum(['newest', 'oldest', 'updated']).default('newest'),
});

export const listAdminUsersQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: adminSearchSchema,
  role: z.enum(userRoles).optional(),
  verification: z.enum(['verified', 'unverified']).optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'recent-login']).default('newest'),
});

export type ListAdminRecipesQuery = z.infer<typeof listAdminRecipesQuerySchema>;
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;
