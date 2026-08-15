import { z } from 'zod';
import { recipeStatuses } from '../models/recipe.model.js';

const adminRecipeSearchSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(100, 'Search cannot exceed 100 characters.').optional(),
);

export const listAdminRecipesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: adminRecipeSearchSchema,
  status: z.enum(recipeStatuses).optional(),
  sort: z.enum(['newest', 'oldest', 'updated']).default('newest'),
});

export type ListAdminRecipesQuery = z.infer<typeof listAdminRecipesQuerySchema>;
