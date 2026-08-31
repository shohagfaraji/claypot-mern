import { describe, expect, it, vi } from 'vitest';

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notifications';

describe('notifications API', () => {
  it('loads the authenticated notification page with its query', async () => {
    const data = {
      notifications: [{ id: 'notification-id', type: 'review_created', readAt: null }],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    };
    const request = vi.fn().mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getNotifications(request, 'page=2&limit=12&status=unread', controller.signal),
    ).resolves.toEqual(data);
    expect(request).toHaveBeenCalledWith('/notifications?page=2&limit=12&status=unread', {
      signal: controller.signal,
    });
  });

  it('loads the unread count for the header indicator', async () => {
    const request = vi.fn().mockResolvedValue({ data: { unreadCount: 4 } });

    await expect(getUnreadNotificationCount(request)).resolves.toBe(4);
    expect(request).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('marks one notification as read', async () => {
    const notification = {
      id: 'notification-id',
      readAt: '2026-08-28T10:00:00.000Z',
    };
    const request = vi.fn().mockResolvedValue({ data: { notification } });

    await expect(markNotificationRead(request, notification.id)).resolves.toEqual(notification);
    expect(request).toHaveBeenCalledWith('/notifications/notification-id/read', {
      method: 'PATCH',
    });
  });

  it('marks every notification as read', async () => {
    const request = vi.fn().mockResolvedValue({ data: { updatedCount: 3 } });

    await expect(markAllNotificationsRead(request)).resolves.toBe(3);
    expect(request).toHaveBeenCalledWith('/notifications/read-all', { method: 'PATCH' });
  });
});
