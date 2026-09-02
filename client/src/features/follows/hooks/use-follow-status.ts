import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { followCook, getFollowStatus, unfollowCook } from '@/features/follows/api/follows';

interface FollowStatusState {
  requestKey: string | null;
  isFollowing: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

const initialState: FollowStatusState = {
  requestKey: null,
  isFollowing: false,
  isLoading: true,
  isUpdating: false,
  error: null,
};

export function useFollowStatus(userId: string, enabled: boolean) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = enabled ? userId : null;
  const isCurrentRequest = state.requestKey === requestKey;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    void getFollowStatus(request, userId, controller.signal)
      .then((isFollowing) => {
        setState({
          requestKey: userId,
          isFollowing,
          isLoading: false,
          isUpdating: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestKey: userId,
          isFollowing: false,
          isLoading: false,
          isUpdating: false,
          error: error instanceof Error ? error.message : 'Follow status could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [enabled, request, requestVersion, userId]);

  const toggle = useCallback(async () => {
    if (!enabled || !isCurrentRequest || state.isUpdating) return state.isFollowing;

    setState((current) => ({ ...current, isUpdating: true, error: null }));
    try {
      const nextFollowing = state.isFollowing ? false : await followCook(request, userId);
      if (state.isFollowing) await unfollowCook(request, userId);
      setState((current) => ({
        ...current,
        isFollowing: nextFollowing,
        isUpdating: false,
      }));
      return nextFollowing;
    } catch (error) {
      setState((current) => ({
        ...current,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Follow status could not be updated.',
      }));
      return state.isFollowing;
    }
  }, [enabled, isCurrentRequest, request, state.isFollowing, state.isUpdating, userId]);

  return {
    isFollowing: isCurrentRequest && state.isFollowing,
    isLoading: enabled && (!isCurrentRequest || state.isLoading),
    isUpdating: isCurrentRequest && state.isUpdating,
    error: isCurrentRequest ? state.error : null,
    retry,
    toggle,
  };
}
