import { createContext } from 'react';

export interface NotificationContextValue {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  clearUnreadCount: () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);
