import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type {
  ListNotificationsQuery,
  NotificationIdParams,
} from '../schemas/notification.schema.js';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service.js';

function getAuthenticatedUserId(auth: Express.Request['auth']): string {
  if (auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  return auth.userId;
}

export const list: RequestHandler = async (request, response) => {
  const result = await listNotifications(
    getAuthenticatedUserId(request.auth),
    request.validatedQuery as ListNotificationsQuery,
  );

  response.status(200).json({
    data: { notifications: result.items, pagination: result.pagination },
  });
};

export const unreadCount: RequestHandler = async (request, response) => {
  const count = await getUnreadNotificationCount(getAuthenticatedUserId(request.auth));
  response.status(200).json({ data: { unreadCount: count } });
};

export const markRead: RequestHandler = async (request, response) => {
  const { notificationId } = request.validatedParams as NotificationIdParams;
  const readAt = await markNotificationRead(getAuthenticatedUserId(request.auth), notificationId);
  response.status(200).json({ data: { notification: { id: notificationId, readAt } } });
};

export const markAllRead: RequestHandler = async (request, response) => {
  const updatedCount = await markAllNotificationsRead(getAuthenticatedUserId(request.auth));
  response.status(200).json({ data: { updatedCount } });
};
