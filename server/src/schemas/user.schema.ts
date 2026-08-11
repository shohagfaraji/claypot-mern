import { z } from 'zod';

export const usernameParamsSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must contain at least 3 characters.')
    .max(30, 'Username cannot exceed 30 characters.')
    .regex(
      /^[a-z0-9][a-z0-9_]*[a-z0-9]$/,
      'Username can contain lowercase letters, numbers, and underscores.',
    ),
});

export type UsernameParams = z.infer<typeof usernameParamsSchema>;
