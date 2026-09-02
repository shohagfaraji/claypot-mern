import { Types, type ClientSession } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateMock, countDocumentsMock, createMock, findOneAndUpdateMock, updateManyMock } =
  vi.hoisted(() => ({
    aggregateMock: vi.fn(),
    countDocumentsMock: vi.fn(),
    createMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(),
    updateManyMock: vi.fn(),
  }));

vi.mock('../../src/models/notification.model.js', () => ({
  NotificationModel: {
    aggregate: aggregateMock,
    countDocuments: countDocumentsMock,
    create: createMock,
    findOneAndUpdate: findOneAndUpdateMock,
    updateMany: updateManyMock,
  },
}));

import {
  createFollowerNotification,
  createReportNotification,
  createReviewNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../src/services/notification.service.js';

const userId = '507f1f77bcf86cd799439011';
const actorId = '507f1f77bcf86cd799439012';
const recipeId = new Types.ObjectId('507f1f77bcf86cd799439013');
const reviewId = new Types.ObjectId('507f1f77bcf86cd799439014');
const reportId = new Types.ObjectId('507f1f77bcf86cd799439015');
const notificationId = '507f1f77bcf86cd799439016';
const session = { id: 'transaction-session' } as unknown as ClientSession;

describe('notification service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates new-review activity in the source transaction', async () => {
    await createReviewNotification({
      recipientId: new Types.ObjectId(userId),
      actorId,
      recipeId,
      reviewId,
      session,
    });

    expect(createMock).toHaveBeenCalledWith(
      [
        {
          recipient: new Types.ObjectId(userId),
          actor: new Types.ObjectId(actorId),
          type: 'review_created',
          recipe: recipeId,
          review: reviewId,
        },
      ],
      { session },
    );
  });

  it('creates report outcome activity without exposing the administrator', async () => {
    await createReportNotification({
      recipientId: new Types.ObjectId(userId),
      recipeId,
      reviewId: null,
      reportId,
      status: 'dismissed',
      session,
    });

    expect(createMock).toHaveBeenCalledWith(
      [
        {
          recipient: new Types.ObjectId(userId),
          type: 'report_dismissed',
          recipe: recipeId,
          review: null,
          report: reportId,
        },
      ],
      { session },
    );
  });

  it('creates new-follower activity without requiring a recipe', async () => {
    await createFollowerNotification({
      recipientId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(actorId),
      session,
    });

    expect(createMock).toHaveBeenCalledWith(
      [
        {
          recipient: new Types.ObjectId(userId),
          actor: new Types.ObjectId(actorId),
          type: 'cook_followed',
        },
      ],
      { session },
    );
  });

  it('lists a stable page of unread activity', async () => {
    const notification = { id: notificationId, type: 'review_created', readAt: null };
    aggregateMock.mockResolvedValue([{ items: [notification], metadata: [{ total: 13 }] }]);

    await expect(
      listNotifications(userId, { page: 2, limit: 12, status: 'unread' }),
    ).resolves.toEqual({
      items: [notification],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    });
    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: { recipient: new Types.ObjectId(userId), readAt: null },
    });
    expect(pipeline[1]).toEqual({ $sort: { createdAt: -1, _id: -1 } });
  });

  it('counts unread activity for the current user', async () => {
    countDocumentsMock.mockResolvedValue(4);

    await expect(getUnreadNotificationCount(userId)).resolves.toBe(4);
    expect(countDocumentsMock).toHaveBeenCalledWith({
      recipient: new Types.ObjectId(userId),
      readAt: null,
    });
  });

  it('marks only an owned notification as read', async () => {
    const readAt = new Date('2026-08-28T10:00:00.000Z');
    findOneAndUpdateMock.mockResolvedValue({ readAt });

    await expect(markNotificationRead(userId, notificationId)).resolves.toEqual(readAt);
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      {
        _id: new Types.ObjectId(notificationId),
        recipient: new Types.ObjectId(userId),
      },
      { $set: { readAt: expect.any(Date) } },
      { returnDocument: 'after' },
    );

    findOneAndUpdateMock.mockResolvedValue(null);
    await expect(markNotificationRead(userId, notificationId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('marks every unread notification for the current user', async () => {
    updateManyMock.mockResolvedValue({ modifiedCount: 3 });

    await expect(markAllNotificationsRead(userId)).resolves.toBe(3);
    expect(updateManyMock).toHaveBeenCalledWith(
      { recipient: new Types.ObjectId(userId), readAt: null },
      { $set: { readAt: expect.any(Date) } },
    );
  });
});
