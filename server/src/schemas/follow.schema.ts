import { z } from 'zod';

export const followUserIdParamsSchema = z.strictObject({
  userId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{24}$/, 'Cook ID is invalid.'),
});

export const listCookConnectionsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export type FollowUserIdParams = z.infer<typeof followUserIdParamsSchema>;
export type ListCookConnectionsQuery = z.infer<typeof listCookConnectionsQuerySchema>;
