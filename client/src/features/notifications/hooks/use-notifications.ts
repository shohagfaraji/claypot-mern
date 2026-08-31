import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getNotifications } from '@/features/notifications/api/notifications';
import type { NotificationListData } from '@/features/notifications/types';

interface NotificationListState extends NotificationListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationListState = {
  requestKey: null,
  notifications: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useNotifications(queryString: string) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === queryString;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  const setNotificationRead = useCallback((notificationId: string, readAt: string) => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, readAt } : notification,
      ),
    }));
  }, []);

  const setAllNotificationsRead = useCallback((readAt: string) => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({ ...notification, readAt })),
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getNotifications(request, queryString, controller.signal)
      .then(({ notifications, pagination }) => {
        setState({
          requestKey: queryString,
          notifications,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: queryString,
          notifications: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Notifications could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, request, requestVersion]);

  return {
    notifications: isCurrentRequest ? state.notifications : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
    setNotificationRead,
    setAllNotificationsRead,
  };
}
