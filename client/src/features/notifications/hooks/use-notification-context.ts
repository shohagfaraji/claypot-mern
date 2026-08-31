import { useContext } from 'react';

import { NotificationContext } from '@/features/notifications/context/notification-context';

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error('useNotificationContext must be used within NotificationProvider.');
  }

  return context;
}
