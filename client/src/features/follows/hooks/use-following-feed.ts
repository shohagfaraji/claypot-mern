import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getFollowingFeed } from '@/features/follows/api/follows';
import type { FollowingFeedData } from '@/features/follows/types';

interface FollowingFeedState extends FollowingFeedData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: FollowingFeedState = {
  requestKey: null,
  recipes: [],
  pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
  followingCount: 0,
  isLoading: true,
  error: null,
};

export function useFollowingFeed(queryString: string) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === queryString;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getFollowingFeed(request, queryString, controller.signal)
      .then(({ recipes, pagination, followingCount }) => {
        setState({
          requestKey: queryString,
          recipes,
          pagination,
          followingCount,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestKey: queryString,
          recipes: [],
          pagination: initialState.pagination,
          followingCount: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Your following feed could not load.',
        });
      });

    return () => controller.abort();
  }, [queryString, request, requestVersion]);

  return {
    recipes: isCurrentRequest ? state.recipes : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    followingCount: isCurrentRequest ? state.followingCount : 0,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
