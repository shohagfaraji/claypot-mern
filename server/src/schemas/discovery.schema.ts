import { z } from 'zod';

const cookSearchSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(80, 'Search cannot exceed 80 characters.').optional(),
);

export const listCooksQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  search: cookSearchSchema,
  sort: z.enum(['popular', 'newest', 'name']).default('popular'),
});

export type ListCooksQuery = z.infer<typeof listCooksQuerySchema>;
