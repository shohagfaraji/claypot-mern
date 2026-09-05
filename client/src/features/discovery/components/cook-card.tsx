import { BookOpen, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { DiscoverableCook } from '@/features/discovery/types';
import { FollowCookButton } from '@/features/follows/components/follow-cook-button';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

export function CookCard({ cook }: { cook: DiscoverableCook }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const [followerCount, setFollowerCount] = useState(cook.followerCount);
  const isCurrentUser = user?.id === cook.id;

  return (
    <Card className="h-full">
      <CardContent className="flex flex-1 items-start gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-base font-bold text-primary">
          {cook.avatarUrl ? (
            <img className="size-full object-cover" src={cook.avatarUrl} alt={cook.name} />
          ) : (
            getInitials(cook.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-2xl font-medium">{cook.name}</h2>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">@{cook.username}</p>
          {cook.bio ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{cook.bio}</p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Explore this cook’s published recipes.
            </p>
          )}
        </div>
      </CardContent>

      <CardContent className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          {cook.publishedRecipeCount} {cook.publishedRecipeCount === 1 ? 'recipe' : 'recipes'}
        </span>
        <span className="inline-flex items-center gap-2">
          <UsersRound className="size-4 text-primary" />
          {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </span>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-3">
        <Link
          className={buttonVariants({ variant: isCurrentUser ? 'default' : 'outline' })}
          to={`/cooks/${cook.username}`}
        >
          {isCurrentUser ? 'Your profile' : 'View profile'}
        </Link>

        {!isCurrentUser && status === 'authenticated' && (
          <FollowCookButton
            userId={cook.id}
            name={cook.name}
            onFollowChange={(isFollowing) =>
              setFollowerCount((count) => Math.max(0, count + (isFollowing ? 1 : -1)))
            }
          />
        )}
        {!isCurrentUser && status === 'unauthenticated' && (
          <Link
            className={cn(buttonVariants(), 'ml-auto')}
            to="/login"
            state={{ from: `${location.pathname}${location.search}${location.hash}` }}
          >
            Follow cook
          </Link>
        )}
        {!isCurrentUser && status === 'loading' && <Button disabled>Checking session…</Button>}
      </CardFooter>
    </Card>
  );
}
