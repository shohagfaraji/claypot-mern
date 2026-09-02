import { ArrowLeft, RefreshCw, UserPlus, UsersRound } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCookConnections } from '@/features/follows/hooks/use-cook-connections';
import type { CookConnectionType } from '@/features/follows/types';
import { useUserProfile } from '@/features/users/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/get-initials';
import { NotFoundPage } from '@/pages/not-found-page';

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function ConnectionSkeleton() {
  return (
    <Card>
      <CardContent className="flex gap-4">
        <Skeleton className="size-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </CardContent>
    </Card>
  );
}

function CookConnectionsPage({ connection }: { connection: CookConnectionType }) {
  const { username = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = getPage(searchParams.get('page'));
  const profile = useUserProfile(username);
  const connections = useCookConnections(
    username,
    connection,
    new URLSearchParams({ page: String(page), limit: '12' }).toString(),
  );
  const isFollowers = connection === 'followers';

  function goToPage(nextPage: number) {
    setSearchParams({ page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (profile.isNotFound || connections.isNotFound) return <NotFoundPage />;

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            to={`/cooks/${username}`}
          >
            <ArrowLeft className="size-4" />
            Back to cook profile
          </Link>
          <div className="mt-7 flex items-center gap-3 text-primary">
            {isFollowers ? <UsersRound className="size-5" /> : <UserPlus className="size-5" />}
            <p className="text-xs font-bold tracking-[0.14em] uppercase">Cook connections</p>
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            {profile.user
              ? isFollowers
                ? `${profile.user.name}’s followers`
                : `Cooks ${profile.user.name} follows`
              : isFollowers
                ? 'Followers'
                : 'Following'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {connections.isLoading
              ? 'Loading connections…'
              : `${connections.pagination.total} ${
                  isFollowers
                    ? connections.pagination.total === 1
                      ? 'follower'
                      : 'followers'
                    : 'followed cooks'
                }`}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        {connections.isLoading || profile.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <ConnectionSkeleton key={index} />
            ))}
          </div>
        ) : connections.error || profile.error ? (
          <Card className="border-destructive/25 bg-destructive/5">
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              <RefreshCw className="size-6 text-destructive" />
              <h2 className="mt-4 font-serif text-2xl font-medium">Connections could not load</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {connections.error ?? profile.error}
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  connections.retry();
                  profile.retry();
                }}
              >
                <RefreshCw />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : connections.cooks.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
              {isFollowers ? (
                <UsersRound className="size-7 text-muted-foreground" />
              ) : (
                <UserPlus className="size-7 text-muted-foreground" />
              )}
              <h2 className="mt-4 font-serif text-2xl font-medium">
                {isFollowers ? 'No followers yet' : 'Not following any cooks yet'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {isFollowers
                  ? 'Followers will appear here as cooks discover this profile.'
                  : 'Follow cooks to keep their latest published recipes close.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {connections.cooks.map((cook) => (
              <Card key={cook.id}>
                <CardContent className="flex items-start gap-4">
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-sm font-bold text-primary">
                    {cook.avatarUrl ? (
                      <img
                        className="size-full object-cover"
                        src={cook.avatarUrl}
                        alt={cook.name}
                      />
                    ) : (
                      getInitials(cook.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-serif text-xl font-medium">{cook.name}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">@{cook.username}</p>
                    {cook.bio && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {cook.bio}
                      </p>
                    )}
                    <Link
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
                      to={`/cooks/${cook.username}`}
                    >
                      View profile
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!connections.isLoading && !connections.error && connections.pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Connection pages">
            <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= connections.pagination.totalPages}
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

export function CookFollowersPage() {
  return <CookConnectionsPage connection="followers" />;
}

export function CookFollowingPage() {
  return <CookConnectionsPage connection="following" />;
}
