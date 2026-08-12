import { useCallback, useEffect, useState } from 'react';

import { getReviews } from '@/features/reviews/api/reviews';
import type { ReviewListData } from '@/features/reviews/types';

interface ReviewListState extends ReviewListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ReviewListState = {
  requestKey: null,
  reviews: [],
  summary: { averageRating: null, reviewCount: 0 },
  pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useReviews(recipeId: string, queryString: string) {
  const requestKey = `${recipeId}?${queryString}`;
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === requestKey;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getReviews(recipeId, queryString, controller.signal)
      .then(({ reviews, summary, pagination }) => {
        setState({
          requestKey,
          reviews,
          summary,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey,
          reviews: [],
          summary: initialState.summary,
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Reviews could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, recipeId, requestKey, requestVersion]);

  return {
    reviews: isCurrentRequest ? state.reviews : [],
    summary: isCurrentRequest ? state.summary : initialState.summary,
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
