import { LoaderCircle, UserCheck, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFollowStatus } from '@/features/follows/hooks/use-follow-status';

interface FollowCookButtonProps {
  userId: string;
  name: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowCookButton({ userId, name, onFollowChange }: FollowCookButtonProps) {
  const followStatus = useFollowStatus(userId, true);

  async function handleToggle() {
    const previousStatus = followStatus.isFollowing;
    const nextStatus = await followStatus.toggle();
    if (nextStatus !== previousStatus) onFollowChange?.(nextStatus);
  }

  return (
    <div>
      <Button
        type="button"
        variant={followStatus.isFollowing ? 'outline' : 'default'}
        disabled={followStatus.isLoading || followStatus.isUpdating}
        aria-label={followStatus.isFollowing ? `Unfollow ${name}` : `Follow ${name}`}
        onClick={() => void handleToggle()}
      >
        {followStatus.isLoading || followStatus.isUpdating ? (
          <LoaderCircle className="animate-spin" />
        ) : followStatus.isFollowing ? (
          <UserCheck />
        ) : (
          <UserPlus />
        )}
        {followStatus.isLoading
          ? 'Checking…'
          : followStatus.isUpdating
            ? 'Updating…'
            : followStatus.isFollowing
              ? 'Following'
              : 'Follow cook'}
      </Button>
      {followStatus.error && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-destructive" role="alert">
            {followStatus.error}
          </p>
          <Button type="button" variant="link" size="xs" onClick={followStatus.retry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
