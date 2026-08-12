import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const { deleteReviewMock, updateReviewMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  deleteReviewMock: vi.fn(),
  updateReviewMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  createAccessToken: vi.fn(),
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/auth.service.js', () => ({
  authenticateUser: vi.fn(),
  getCurrentUser: vi.fn(),
  registerUser: vi.fn(),
  updateCurrentUser: vi.fn(),
}));

vi.mock('../../src/services/session.service.js', () => ({
  createAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
  rotateAuthSession: vi.fn(),
}));

vi.mock('../../src/services/review.service.js', () => ({
  createReview: vi.fn(),
  deleteReview: deleteReviewMock,
  listReviews: vi.fn(),
  updateReview: updateReviewMock,
}));

import { createApp } from '../../src/app.js';

const reviewId = '507f1f77bcf86cd799439013';

describe('PATCH /api/v1/reviews/:reviewId', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates a review owned by the current user', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    updateReviewMock.mockResolvedValue({
      id: reviewId,
      rating: 4,
      comment: 'Clear instructions and a very good result.',
    });

    const response = await request(app)
      .patch(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ rating: 4 })
      .expect(200);

    expect(updateReviewMock).toHaveBeenCalledWith(reviewId, 'user-id', { rating: 4 });
    expect(response.body.data.review.rating).toBe(4);
  });

  it('authenticates before validating the identifier and body', async () => {
    const response = await request(app).patch('/api/v1/reviews/invalid-id').send({}).expect(401);

    expect(updateReviewMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns not found without revealing review ownership', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    updateReviewMock.mockRejectedValue(
      new AppError(404, 'REVIEW_NOT_FOUND', 'Review was not found.'),
    );

    const response = await request(app)
      .patch(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ comment: 'This updated review has enough detail.' })
      .expect(404);

    expect(response.body.error.code).toBe('REVIEW_NOT_FOUND');
  });
});

describe('DELETE /api/v1/reviews/:reviewId', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deletes an owned review', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    deleteReviewMock.mockResolvedValue(undefined);

    await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(deleteReviewMock).toHaveBeenCalledWith(reviewId, {
      userId: 'user-id',
      role: 'user',
    });
  });

  it('rejects requests without authentication', async () => {
    const response = await request(app).delete(`/api/v1/reviews/${reviewId}`).expect(401);

    expect(deleteReviewMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
