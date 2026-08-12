import { describe, expect, it } from 'vitest';
import {
  createReviewInputSchema,
  listReviewsQuerySchema,
  reviewIdParamsSchema,
  updateReviewInputSchema,
} from '../../src/schemas/review.schema.js';

describe('review schemas', () => {
  it('normalizes valid review content', () => {
    expect(
      createReviewInputSchema.parse({
        rating: 5,
        comment: '  Clear instructions and an excellent result.  ',
      }),
    ).toEqual({
      rating: 5,
      comment: 'Clear instructions and an excellent result.',
    });
  });

  it('validates ratings, comments, and controlled fields', () => {
    expect(createReviewInputSchema.safeParse({ rating: 0, comment: 'short' }).success).toBe(false);
    expect(
      createReviewInputSchema.safeParse({
        rating: 5,
        comment: 'A sufficiently detailed review.',
        user: 'forced-user',
      }).success,
    ).toBe(false);
  });

  it('requires at least one valid field when updating', () => {
    expect(updateReviewInputSchema.safeParse({}).success).toBe(false);
    expect(updateReviewInputSchema.parse({ rating: 4 })).toEqual({ rating: 4 });
  });

  it('provides stable listing defaults and validates identifiers', () => {
    expect(listReviewsQuerySchema.parse({})).toEqual({ page: 1, limit: 10, sort: 'newest' });
    expect(listReviewsQuerySchema.safeParse({ limit: 25, sort: 'popular' }).success).toBe(false);
    expect(reviewIdParamsSchema.parse({ reviewId: '507F1F77BCF86CD799439012' })).toEqual({
      reviewId: '507f1f77bcf86cd799439012',
    });
  });
});
