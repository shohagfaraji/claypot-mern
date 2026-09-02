import { Types, type ClientSession, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { NotificationModel, type Notification } from '../models/notification.model.js';
import type { ListNotificationsQuery } from '../schemas/notification.schema.js';

export interface PublicNotification {
  id: string;
  type: Notification['type'];
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  recipe: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface PaginatedNotifications {
  items: PublicNotification[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface NotificationAggregation {
  items: PublicNotification[];
  metadata: Array<{ total: number }>;
}

interface CreateReviewNotificationInput {
  recipientId: Types.ObjectId;
  actorId: string;
  recipeId: Types.ObjectId;
  reviewId: Types.ObjectId;
  session: ClientSession;
}

interface CreateReportNotificationInput {
  recipientId: Types.ObjectId;
  recipeId: Types.ObjectId;
  reviewId: Types.ObjectId | null;
  reportId: Types.ObjectId;
  status: 'resolved' | 'dismissed';
  session: ClientSession;
}

interface CreateFollowerNotificationInput {
  recipientId: Types.ObjectId;
  actorId: Types.ObjectId;
  session: ClientSession;
}

export async function createReviewNotification({
  recipientId,
  actorId,
  recipeId,
  reviewId,
  session,
}: CreateReviewNotificationInput): Promise<void> {
  await NotificationModel.create(
    [
      {
        recipient: recipientId,
        actor: new Types.ObjectId(actorId),
        type: 'review_created',
        recipe: recipeId,
        review: reviewId,
      },
    ],
    { session },
  );
}

export async function createReportNotification({
  recipientId,
  recipeId,
  reviewId,
  reportId,
  status,
  session,
}: CreateReportNotificationInput): Promise<void> {
  await NotificationModel.create(
    [
      {
        recipient: recipientId,
        type: status === 'resolved' ? 'report_resolved' : 'report_dismissed',
        recipe: recipeId,
        review: reviewId,
        report: reportId,
      },
    ],
    { session },
  );
}

export async function createFollowerNotification({
  recipientId,
  actorId,
  session,
}: CreateFollowerNotificationInput): Promise<void> {
  await NotificationModel.create(
    [
      {
        recipient: recipientId,
        actor: actorId,
        type: 'cook_followed',
      },
    ],
    { session },
  );
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<PaginatedNotifications> {
  const match: Record<string, unknown> = { recipient: new Types.ObjectId(userId) };
  if (query.status === 'unread') match.readAt = null;
  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: {
              from: 'users',
              localField: 'actor',
              foreignField: '_id',
              as: 'actorProfile',
            },
          },
          { $lookup: { from: 'recipes', localField: 'recipe', foreignField: '_id', as: 'recipe' } },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              type: 1,
              readAt: 1,
              createdAt: 1,
              actor: {
                $cond: [
                  { $gt: [{ $size: '$actorProfile' }, 0] },
                  {
                    id: { $toString: { $arrayElemAt: ['$actorProfile._id', 0] } },
                    name: { $arrayElemAt: ['$actorProfile.name', 0] },
                    username: { $arrayElemAt: ['$actorProfile.username', 0] },
                    avatarUrl: { $arrayElemAt: ['$actorProfile.avatarUrl', 0] },
                  },
                  null,
                ],
              },
              recipe: {
                $cond: [
                  { $gt: [{ $size: '$recipe' }, 0] },
                  {
                    id: { $toString: { $arrayElemAt: ['$recipe._id', 0] } },
                    title: { $arrayElemAt: ['$recipe.title', 0] },
                    slug: { $arrayElemAt: ['$recipe.slug', 0] },
                  },
                  null,
                ],
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];
  const [result] = await NotificationModel.aggregate<NotificationAggregation>(pipeline);
  const items = result?.items ?? [];
  const total = result?.metadata[0]?.total ?? 0;

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return NotificationModel.countDocuments({
    recipient: new Types.ObjectId(userId),
    readAt: null,
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<Date> {
  const readAt = new Date();
  const notification = await NotificationModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId),
    },
    { $set: { readAt } },
    { returnDocument: 'after' },
  );

  if (notification === null) {
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
  }

  return notification.readAt as Date;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await NotificationModel.updateMany(
    { recipient: new Types.ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } },
  );

  return result.modifiedCount;
}
