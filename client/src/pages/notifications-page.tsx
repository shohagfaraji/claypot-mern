import {
  Bell,
  CheckCheck,
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notifications';
import { useNotificationContext } from '@/features/notifications/hooks/use-notification-context';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import type { AppNotification } from '@/features/notifications/types';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getNotificationCopy(notification: AppNotification) {
  if (notification.type === 'review_created') {
    return {
      title: `${notification.actor?.name ?? 'A cook'} reviewed your recipe`,
      description: `A new review was added to “${notification.recipe.title}”.`,
    };
  }

  if (notification.type === 'report_resolved') {
    return {
      title: 'Your content report was resolved',
      description: `An administrator completed the review of your report concerning “${notification.recipe.title}”.`,
    };
  }

  return {
    title: 'Your content report was dismissed',
    description: `An administrator reviewed your report concerning “${notification.recipe.title}” and closed it without further action.`,
  };
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'review_created') return <MessageSquareText />;
  return type === 'report_resolved' ? <CircleCheck /> : <CircleX />;
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading notifications">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex gap-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const request = useAuthenticatedRequest();
  const { unreadCount, decrementUnreadCount, clearUnreadCount, refreshUnreadCount } =
    useNotificationContext();
  const status = searchParams.get('status') === 'unread' ? 'unread' : 'all';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '12' });
  if (status === 'unread') query.set('status', 'unread');
  const notificationList = useNotifications(query.toString());
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function updateStatus(value: string | null) {
    setSearchParams(value === 'unread' ? { status: 'unread' } : {});
  }

  function goToPage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleMarkRead(notification: AppNotification) {
    if (notification.readAt !== null || markingId !== null) return;

    setActionError(null);
    setMarkingId(notification.id);

    try {
      const updated = await markNotificationRead(request, notification.id);
      decrementUnreadCount();
      setMarkingId(null);

      if (status === 'unread') {
        if (notificationList.notifications.length === 1 && page > 1) goToPage(page - 1);
        else notificationList.retry();
      } else {
        notificationList.setNotificationRead(notification.id, updated.readAt);
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'The notification could not be updated.',
      );
      setMarkingId(null);
      await refreshUnreadCount();
    }
  }

  async function handleMarkAllRead() {
    if (isMarkingAll || unreadCount === 0) return;

    setActionError(null);
    setIsMarkingAll(true);

    try {
      await markAllNotificationsRead(request);
      clearUnreadCount();
      setIsMarkingAll(false);

      if (status === 'unread') {
        if (page > 1) updateStatus('unread');
        else notificationList.retry();
      } else {
        notificationList.setAllNotificationsRead(new Date().toISOString());
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Notifications could not be updated.',
      );
      setIsMarkingAll(false);
      await refreshUnreadCount();
    }
  }

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
              Activity and updates
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Notifications
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep track of new feedback on your recipes and updates to content reports.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={isMarkingAll}
              onClick={() => void handleMarkAllRead()}
            >
              {isMarkingAll ? <LoaderCircle className="animate-spin" /> : <CheckCheck />}
              {isMarkingAll ? 'Marking all…' : 'Mark all as read'}
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <p className="text-sm font-semibold">
              {notificationList.isLoading
                ? 'Loading activity…'
                : `${notificationList.pagination.total} ${
                    notificationList.pagination.total === 1 ? 'notification' : 'notifications'
                  }`}
            </p>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
          </div>

          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter notifications">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity</SelectItem>
              <SelectItem value="unread">Unread only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {actionError && (
          <div
            className="mt-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {actionError}
          </div>
        )}

        <div className="mt-6">
          {notificationList.isLoading ? (
            <NotificationsSkeleton />
          ) : notificationList.error ? (
            <Card className="border-destructive/25 bg-destructive/5">
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <RefreshCw className="size-6 text-destructive" />
                <h2 className="mt-4 font-serif text-2xl font-medium">
                  Notifications could not load
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {notificationList.error}
                </p>
                <Button className="mt-5" variant="outline" onClick={notificationList.retry}>
                  <RefreshCw />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : notificationList.notifications.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <Bell className="size-7 text-muted-foreground" />
                <h2 className="mt-4 font-serif text-2xl font-medium">
                  {status === 'unread' ? 'You are all caught up' : 'No activity yet'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {status === 'unread'
                    ? 'There are no unread notifications in your inbox.'
                    : 'Review activity and report updates will appear here.'}
                </p>
                {status === 'unread' && (
                  <Button className="mt-5" variant="outline" onClick={() => updateStatus('all')}>
                    View all activity
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notificationList.notifications.map((notification) => {
                const copy = getNotificationCopy(notification);
                const isUnread = notification.readAt === null;

                return (
                  <Card
                    key={notification.id}
                    className={cn(isUnread && 'border-primary/25 bg-primary/4')}
                  >
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="relative shrink-0">
                        {notification.type === 'review_created' && notification.actor ? (
                          <div className="grid size-11 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-primary">
                            {notification.actor.avatarUrl ? (
                              <img
                                className="size-full object-cover"
                                src={notification.actor.avatarUrl}
                                alt={notification.actor.name}
                              />
                            ) : (
                              getInitials(notification.actor.name)
                            )}
                          </div>
                        ) : (
                          <div className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
                            <NotificationIcon type={notification.type} />
                          </div>
                        )}
                        {isUnread && (
                          <span
                            className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-primary"
                            aria-label="Unread"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold sm:text-base">{copy.title}</h2>
                          {isUnread && <Badge>New</Badge>}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {copy.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(notification.createdAt))}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {isUnread && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={markingId !== null || isMarkingAll}
                            onClick={() => void handleMarkRead(notification)}
                          >
                            {markingId === notification.id ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <CircleCheck />
                            )}
                            {markingId === notification.id ? 'Updating…' : 'Mark read'}
                          </Button>
                        )}
                        <Link
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                          to={`/recipes/${notification.recipe.slug}`}
                        >
                          <ExternalLink />
                          View recipe
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {!notificationList.isLoading &&
          !notificationList.error &&
          notificationList.pagination.totalPages > 1 && (
            <nav
              className="mt-8 flex items-center justify-between border-t pt-6"
              aria-label="Notification pages"
            >
              <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                {page} / {notificationList.pagination.totalPages}
              </p>
              <Button
                variant="outline"
                disabled={page >= notificationList.pagination.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
      </section>
    </AppShell>
  );
}
