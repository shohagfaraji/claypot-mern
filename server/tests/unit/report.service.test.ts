import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aggregateReportsMock,
  createReportMock,
  findRecipeMock,
  findReportAndUpdateMock,
  findReviewMock,
  reportExistsMock,
  recipeExistsMock,
  selectRecipeMock,
  selectReviewMock,
} = vi.hoisted(() => ({
  aggregateReportsMock: vi.fn(),
  createReportMock: vi.fn(),
  findRecipeMock: vi.fn(),
  findReportAndUpdateMock: vi.fn(),
  findReviewMock: vi.fn(),
  reportExistsMock: vi.fn(),
  recipeExistsMock: vi.fn(),
  selectRecipeMock: vi.fn(),
  selectReviewMock: vi.fn(),
}));

vi.mock('../../src/models/content-report.model.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/models/content-report.model.js')>()),
  ContentReportModel: {
    aggregate: aggregateReportsMock,
    create: createReportMock,
    exists: reportExistsMock,
    findOneAndUpdate: findReportAndUpdateMock,
  },
}));
vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { exists: recipeExistsMock, findOne: findRecipeMock },
}));
vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: { findById: findReviewMock },
}));

import {
  createContentReport,
  listContentReports,
  reviewContentReport,
} from '../../src/services/report.service.js';

const reporterId = '507f1f77bcf86cd799439011';
const recipeId = '507f1f77bcf86cd799439012';
const reviewId = '507f1f77bcf86cd799439013';
const authorId = '507f1f77bcf86cd799439014';

describe('content report service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findRecipeMock.mockReturnValue({ select: selectRecipeMock });
    findReviewMock.mockReturnValue({ select: selectReviewMock });
    createReportMock.mockResolvedValue({
      id: 'report-id',
      createdAt: new Date('2026-08-28T08:00:00.000Z'),
    });
  });

  it('creates a report for a published recipe owned by another user', async () => {
    selectRecipeMock.mockResolvedValue({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(authorId),
    });

    await expect(
      createContentReport(reporterId, {
        targetType: 'recipe',
        targetId: recipeId,
        reason: 'misleading',
        details: 'The preparation details conflict with the ingredients.',
      }),
    ).resolves.toEqual({
      id: 'report-id',
      status: 'open',
      createdAt: new Date('2026-08-28T08:00:00.000Z'),
    });
    expect(createReportMock).toHaveBeenCalledWith({
      reporter: new Types.ObjectId(reporterId),
      targetAuthor: new Types.ObjectId(authorId),
      targetType: 'recipe',
      recipe: new Types.ObjectId(recipeId),
      review: null,
      reason: 'misleading',
      details: 'The preparation details conflict with the ingredients.',
    });
  });

  it('creates a report for a review attached to a published recipe', async () => {
    selectReviewMock.mockResolvedValue({
      _id: new Types.ObjectId(reviewId),
      recipe: new Types.ObjectId(recipeId),
      user: new Types.ObjectId(authorId),
    });
    recipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId(recipeId) });

    await createContentReport(reporterId, {
      targetType: 'review',
      targetId: reviewId,
      reason: 'harassment',
      details: null,
    });

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'review',
        recipe: new Types.ObjectId(recipeId),
        review: new Types.ObjectId(reviewId),
        targetAuthor: new Types.ObjectId(authorId),
      }),
    );
  });

  it('rejects missing, owned, and duplicate report targets', async () => {
    selectRecipeMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(reporterId),
    });

    await expect(
      createContentReport(reporterId, {
        targetType: 'recipe',
        targetId: recipeId,
        reason: 'spam',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'REPORT_TARGET_NOT_FOUND' });
    await expect(
      createContentReport(reporterId, {
        targetType: 'recipe',
        targetId: recipeId,
        reason: 'spam',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'OWN_CONTENT_REPORT' });

    selectRecipeMock.mockResolvedValue({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(authorId),
    });
    createReportMock.mockRejectedValue({ code: 11000 });
    await expect(
      createContentReport(reporterId, {
        targetType: 'recipe',
        targetId: recipeId,
        reason: 'spam',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REPORT_ALREADY_EXISTS' });
  });

  it('returns filtered reports with stable pagination', async () => {
    const report = { id: 'report-id', targetType: 'review', status: 'open' };
    aggregateReportsMock.mockResolvedValue([{ items: [report], metadata: [{ total: 11 }] }]);

    await expect(
      listContentReports({
        page: 2,
        limit: 10,
        status: 'open',
        targetType: 'review',
        reason: 'spam',
        sort: 'oldest',
      }),
    ).resolves.toEqual({
      items: [report],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
    const pipeline = aggregateReportsMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: { status: 'open', targetType: 'review', reason: 'spam' },
    });
    expect(pipeline[1]).toEqual({ $sort: { createdAt: 1, _id: 1 } });
  });

  it('records one final moderation decision', async () => {
    findReportAndUpdateMock.mockResolvedValue({
      id: 'report-id',
      status: 'resolved',
      resolutionNote: 'The content was reviewed and appropriate action was completed.',
      reviewedAt: new Date('2026-08-28T09:00:00.000Z'),
    });

    await expect(
      reviewContentReport('507f1f77bcf86cd799439015', reporterId, {
        status: 'resolved',
        note: 'The content was reviewed and appropriate action was completed.',
      }),
    ).resolves.toMatchObject({ id: 'report-id', status: 'resolved' });
    expect(findReportAndUpdateMock).toHaveBeenCalledWith(
      { _id: new Types.ObjectId('507f1f77bcf86cd799439015'), status: 'open' },
      {
        $set: expect.objectContaining({
          status: 'resolved',
          reviewedBy: new Types.ObjectId(reporterId),
        }),
      },
      { returnDocument: 'after' },
    );

    findReportAndUpdateMock.mockResolvedValue(null);
    reportExistsMock.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(
      reviewContentReport('507f1f77bcf86cd799439015', reporterId, {
        status: 'dismissed',
        note: 'This report was already reviewed by another administrator.',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REPORT_ALREADY_REVIEWED' });
  });
});
