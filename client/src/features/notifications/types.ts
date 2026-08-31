export type NotificationType = 'review_created' | 'report_resolved' | 'report_dismissed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
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
  };
}

export interface NotificationListData {
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
