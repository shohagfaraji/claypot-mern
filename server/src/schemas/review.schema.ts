import { z } from 'zod';

const ratingSchema = z
  .number()
  .int('Rating must be a whole number.')
  .min(1, 'Rating must be at least 1.')
  .max(5, 'Rating cannot exceed 5.');

const commentSchema = z
  .string()
  .trim()
  .min(10, 'Review must contain at least 10 characters.')
  .max(1_000, 'Review cannot exceed 1000 characters.');

export const createReviewInputSchema = z.strictObject({
  rating: ratingSchema,
  comment: commentSchema,
});

export const updateReviewInputSchema = z
  .strictObject({
    rating: ratingSchema.optional(),
    comment: commentSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Add at least one review field to update.',
  });

export const listReviewsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(10),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
});

export const reviewIdParamsSchema = z.strictObject({
  reviewId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{24}$/, 'Review ID is invalid.'),
});

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ReviewIdParams = z.infer<typeof reviewIdParamsSchema>;
