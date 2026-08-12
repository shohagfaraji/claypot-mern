import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getCurrentUserReview } from '@/features/reviews/api/reviews';
import type { RecipeReview } from '@/features/reviews/types';

interface CurrentUserReviewState {
  requestKey: string | null;
  review: RecipeReview | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CurrentUserReviewState = {
  requestKey: null,
  review: null,
  isLoading: false,
  error: null,
};

export function useCurrentUserReview(recipeId: string, enabled: boolean) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = enabled && state.requestKey === recipeId;

  const retry = useCallback(() => {
    if (!enabled) return;
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    void getCurrentUserReview(request, recipeId, controller.signal)
      .then((review) => {
        setState({ requestKey: recipeId, review, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: recipeId,
          review: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Your review status could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [enabled, recipeId, request, requestVersion]);

  return {
    review: isCurrentRequest ? state.review : null,
    isLoading: enabled && (!isCurrentRequest || state.isLoading),
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
