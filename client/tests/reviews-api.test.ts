import { describe, expect, it, vi } from 'vitest';

import {
  createReview,
  deleteReview,
  getCurrentUserReview,
  updateReview,
} from '@/features/reviews/api/reviews';

const review = {
  id: 'review-id',
  rating: 5,
  comment: 'Clear instructions and an excellent result.',
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
  user: {
    id: 'user-id',
    name: 'Amina Noor',
    username: 'amina_kitchen',
    avatarUrl: null,
  },
};

describe('authenticated review API', () => {
  it('loads the current user review independently of public pagination', async () => {
    const request = vi.fn().mockResolvedValue({ data: { review } });

    await expect(getCurrentUserReview(request, 'recipe-id')).resolves.toEqual(review);
    expect(request).toHaveBeenCalledWith('/recipes/recipe-id/reviews/mine', {
      signal: undefined,
    });
  });

  it('creates a review with JSON content', async () => {
    const request = vi.fn().mockResolvedValue({ data: { review } });
    const input = { rating: 5, comment: review.comment };

    await expect(createReview(request, 'recipe-id', input)).resolves.toEqual(review);
    expect(request).toHaveBeenCalledWith('/recipes/recipe-id/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('updates an existing review with JSON content', async () => {
    const request = vi.fn().mockResolvedValue({ data: { review: { ...review, rating: 4 } } });
    const input = { rating: 4, comment: review.comment };

    await expect(updateReview(request, review.id, input)).resolves.toMatchObject({ rating: 4 });
    expect(request).toHaveBeenCalledWith('/reviews/review-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('deletes a review using its resource URL', async () => {
    const request = vi.fn().mockResolvedValue(undefined);

    await expect(deleteReview(request, review.id)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith('/reviews/review-id', { method: 'DELETE' });
  });
});
