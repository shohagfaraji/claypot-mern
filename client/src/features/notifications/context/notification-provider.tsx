import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getUnreadNotificationCount } from '@/features/notifications/api/notifications';
import { NotificationContext } from '@/features/notifications/context/notification-context';

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { status, user } = useAuth();
  const request = useAuthenticatedRequest();
  const currentUserId = status === 'authenticated' ? (user?.id ?? null) : null;
  const [snapshot, setSnapshot] = useState<{ userId: string | null; unreadCount: number }>({
    userId: null,
    unreadCount: 0,
  });

  const refreshUnreadCount = useCallback(async () => {
    if (currentUserId === null) return;

    try {
      const unreadCount = await getUnreadNotificationCount(request);
      setSnapshot({ userId: currentUserId, unreadCount });
    } catch {
      // The notification indicator should not interrupt primary navigation.
      setSnapshot({ userId: currentUserId, unreadCount: 0 });
    }
  }, [currentUserId, request]);

  const decrementUnreadCount = useCallback(() => {
    if (currentUserId === null) return;
    setSnapshot((current) => ({
      userId: currentUserId,
      unreadCount: current.userId === currentUserId ? Math.max(0, current.unreadCount - 1) : 0,
    }));
  }, [currentUserId]);

  const clearUnreadCount = useCallback(() => {
    if (currentUserId !== null) setSnapshot({ userId: currentUserId, unreadCount: 0 });
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId === null) return;

    const initialRefreshId = window.setTimeout(() => void refreshUnreadCount(), 0);
    const intervalId = window.setInterval(() => void refreshUnreadCount(), 60_000);
    const handleFocus = () => void refreshUnreadCount();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUserId, refreshUnreadCount]);

  const hasCurrentSnapshot = currentUserId !== null && snapshot.userId === currentUserId;

  const value = useMemo(
    () => ({
      unreadCount: hasCurrentSnapshot ? snapshot.unreadCount : 0,
      isLoading: currentUserId !== null && !hasCurrentSnapshot,
      refreshUnreadCount,
      decrementUnreadCount,
      clearUnreadCount,
    }),
    [
      clearUnreadCount,
      currentUserId,
      decrementUnreadCount,
      hasCurrentSnapshot,
      refreshUnreadCount,
      snapshot.unreadCount,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
