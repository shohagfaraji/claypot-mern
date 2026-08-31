import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getUnreadNotificationCountMock,
  listNotificationsMock,
  markAllNotificationsReadMock,
  markNotificationReadMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  getUnreadNotificationCountMock: vi.fn(),
  listNotificationsMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));
vi.mock('../../src/services/notification.service.js', () => ({
  getUnreadNotificationCount: getUnreadNotificationCountMock,
  listNotifications: listNotificationsMock,
  markAllNotificationsRead: markAllNotificationsReadMock,
  markNotificationRead: markNotificationReadMock,
}));

import { createApp } from '../../src/app.js';

const notificationId = '507f1f77bcf86cd799439011';

describe('notification routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
  });

  it('returns a validated notification page for the current user', async () => {
    listNotificationsMock.mockResolvedValue({
      items: [{ id: notificationId, type: 'review_created' }],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    });

    const response = await request(app)
      .get('/api/v1/notifications?page=2&status=unread')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listNotificationsMock).toHaveBeenCalledWith('user-id', {
      page: 2,
      limit: 12,
      status: 'unread',
    });
    expect(response.body.data.notifications[0].type).toBe('review_created');
  });

  it('returns the unread count', async () => {
    getUnreadNotificationCountMock.mockResolvedValue(5);

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(getUnreadNotificationCountMock).toHaveBeenCalledWith('user-id');
    expect(response.body.data.unreadCount).toBe(5);
  });

  it('marks one validated notification as read', async () => {
    const readAt = new Date('2026-08-28T10:00:00.000Z');
    markNotificationReadMock.mockResolvedValue(readAt);

    const response = await request(app)
      .patch(`/api/v1/notifications/${notificationId.toUpperCase()}/read`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(markNotificationReadMock).toHaveBeenCalledWith('user-id', notificationId);
    expect(response.body.data.notification).toMatchObject({ id: notificationId });
  });

  it('marks the current user unread notifications as read', async () => {
    markAllNotificationsReadMock.mockResolvedValue(3);

    const response = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(markAllNotificationsReadMock).toHaveBeenCalledWith('user-id');
    expect(response.body.data.updatedCount).toBe(3);
  });

  it('authenticates before validating notification requests', async () => {
    verifyAccessTokenMock.mockRejectedValue(new Error('invalid token'));

    await request(app).get('/api/v1/notifications?status=invalid').expect(401);
    await request(app).patch('/api/v1/notifications/invalid/read').expect(401);
    expect(listNotificationsMock).not.toHaveBeenCalled();
    expect(markNotificationReadMock).not.toHaveBeenCalled();
  });
});
