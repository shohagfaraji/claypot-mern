import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aggregateMock,
  createReviewMock,
  deleteReportsMock,
  deleteReviewMock,
  endSessionMock,
  findRecipeMock,
  findReviewMock,
  recipeExistsMock,
  selectRecipeMock,
  startSessionMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
  createReviewMock: vi.fn(),
  deleteReportsMock: vi.fn(),
  deleteReviewMock: vi.fn(),
  endSessionMock: vi.fn(),
  findRecipeMock: vi.fn(),
  findReviewMock: vi.fn(),
  recipeExistsMock: vi.fn(),
  selectRecipeMock: vi.fn(),
  startSessionMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));

vi.mock('../../src/models/content-report.model.js', () => ({
  ContentReportModel: { deleteMany: deleteReportsMock },
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { exists: recipeExistsMock, findOne: findRecipeMock },
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {
    aggregate: aggregateMock,
    create: createReviewMock,
    findOne: findReviewMock,
    findOneAndDelete: deleteReviewMock,
  },
}));

import {
  createReview,
  deleteReview,
  getCurrentUserReview,
  listReviews,
  updateReview,
} from '../../src/services/review.service.js';

const recipeId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439011';
const reviewId = '507f1f77bcf86cd799439013';

function createReviewDocument() {
  const document = {
    id: reviewId,
    rating: 5,
    comment: 'Clear instructions and an excellent result.',
    createdAt: new Date('2026-08-12T08:00:00.000Z'),
    updatedAt: new Date('2026-08-12T08:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
    populate: vi.fn(),
  };
  document.populate.mockResolvedValue({
    ...document,
    user: {
      id: userId,
      name: 'Amina Noor',
      username: 'amina_kitchen',
      avatarUrl: null,
    },
  });
  return document;
}

describe('review service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findRecipeMock.mockReturnValue({ select: selectRecipeMock });
    recipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId(recipeId) });
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
  });

  it('creates one review for another cook published recipe', async () => {
    const review = createReviewDocument();
    selectRecipeMock.mockResolvedValue({ author: new Types.ObjectId() });
    createReviewMock.mockResolvedValue(review);

    const result = await createReview(
      recipeId,
      { userId, role: 'user' },
      {
        rating: 5,
        comment: 'Clear instructions and an excellent result.',
      },
    );

    expect(findRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
      status: 'published',
    });
    expect(createReviewMock).toHaveBeenCalledWith({
      recipe: new Types.ObjectId(recipeId),
      user: new Types.ObjectId(userId),
      rating: 5,
      comment: 'Clear instructions and an excellent result.',
    });
    expect(result).toMatchObject({ id: reviewId, rating: 5, user: { username: 'amina_kitchen' } });
  });

  it('rejects reviews for private, missing, or owned recipes', async () => {
    selectRecipeMock.mockResolvedValue(null);
    await expect(
      createReview(recipeId, { userId, role: 'user' }, { rating: 5, comment: 'Excellent recipe.' }),
    ).rejects.toMatchObject({ code: 'RECIPE_NOT_FOUND' });

    selectRecipeMock.mockResolvedValue({ author: new Types.ObjectId(userId) });
    await expect(
      createReview(recipeId, { userId, role: 'user' }, { rating: 5, comment: 'Excellent recipe.' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'OWN_RECIPE_REVIEW' });
  });

  it('returns a conflict when the user already reviewed the recipe', async () => {
    selectRecipeMock.mockResolvedValue({ author: new Types.ObjectId() });
    createReviewMock.mockRejectedValue({ code: 11000 });

    await expect(
      createReview(recipeId, { userId, role: 'user' }, { rating: 4, comment: 'Very good recipe.' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REVIEW_ALREADY_EXISTS' });
  });

  it('lists reviews with a rounded summary and pagination', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ id: reviewId, rating: 5 }],
        summary: [{ averageRating: 4.6, reviewCount: 21 }],
      },
    ]);

    await expect(listReviews(recipeId, { page: 2, limit: 10, sort: 'highest' })).resolves.toEqual({
      items: [{ id: reviewId, rating: 5 }],
      summary: { averageRating: 4.6, reviewCount: 21 },
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: { recipe: new Types.ObjectId(recipeId) } });
  });

  it('does not expose reviews for private or missing recipes', async () => {
    recipeExistsMock.mockResolvedValue(null);

    await expect(
      listReviews(recipeId, { page: 1, limit: 10, sort: 'newest' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RECIPE_NOT_FOUND' });
    expect(aggregateMock).not.toHaveBeenCalled();
  });

  it('returns the current user review independently of list pagination', async () => {
    const review = createReviewDocument();
    findReviewMock.mockResolvedValue(review);

    await expect(getCurrentUserReview(recipeId, userId)).resolves.toMatchObject({
      id: reviewId,
      user: { id: userId },
    });
    expect(findReviewMock).toHaveBeenCalledWith({
      recipe: new Types.ObjectId(recipeId),
      user: new Types.ObjectId(userId),
    });

    findReviewMock.mockResolvedValue(null);
    await expect(getCurrentUserReview(recipeId, userId)).resolves.toBeNull();
  });

  it('updates only a review owned by the current user', async () => {
    const review = createReviewDocument();
    findReviewMock.mockResolvedValue(review);

    const result = await updateReview(reviewId, userId, { rating: 4 });

    expect(findReviewMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(reviewId),
      user: new Types.ObjectId(userId),
    });
    expect(review.rating).toBe(4);
    expect(review.save).toHaveBeenCalledOnce();
    expect(result.rating).toBe(4);
  });

  it('allows owners and administrators to delete without revealing ownership', async () => {
    deleteReviewMock.mockResolvedValue({ id: reviewId });

    await deleteReview(reviewId, { userId, role: 'user' });
    expect(deleteReviewMock).toHaveBeenLastCalledWith(
      {
        _id: new Types.ObjectId(reviewId),
        user: new Types.ObjectId(userId),
      },
      { session: expect.any(Object) },
    );

    await deleteReview(reviewId, { userId: '507f1f77bcf86cd799439014', role: 'admin' });
    expect(deleteReviewMock).toHaveBeenLastCalledWith(
      { _id: new Types.ObjectId(reviewId) },
      { session: expect.any(Object) },
    );
    expect(deleteReportsMock).toHaveBeenCalledWith(
      { review: new Types.ObjectId(reviewId) },
      { session: expect.any(Object) },
    );

    deleteReviewMock.mockResolvedValue(null);
    await expect(deleteReview(reviewId, { userId, role: 'user' })).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
    });
  });
});
