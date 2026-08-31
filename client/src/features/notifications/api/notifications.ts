import type { NotificationListData } from '@/features/notifications/types';

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

interface NotificationListResponse {
  data: NotificationListData;
}

interface UnreadNotificationCountResponse {
  data: { unreadCount: number };
}

interface MarkNotificationReadResponse {
  data: { notification: { id: string; readAt: string } };
}

interface MarkAllNotificationsReadResponse {
  data: { updatedCount: number };
}

export async function getNotifications(
  request: AuthenticatedRequest,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<NotificationListResponse>(`/notifications${query}`, { signal });
  return response.data;
}

export async function getUnreadNotificationCount(request: AuthenticatedRequest) {
  const response = await request<UnreadNotificationCountResponse>('/notifications/unread-count');
  return response.data.unreadCount;
}

export async function markNotificationRead(request: AuthenticatedRequest, notificationId: string) {
  const response = await request<MarkNotificationReadResponse>(
    `/notifications/${notificationId}/read`,
    { method: 'PATCH' },
  );
  return response.data.notification;
}

export async function markAllNotificationsRead(request: AuthenticatedRequest) {
  const response = await request<MarkAllNotificationsReadResponse>('/notifications/read-all', {
    method: 'PATCH',
  });
  return response.data.updatedCount;
}
