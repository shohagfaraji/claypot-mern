import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getSavedRecipes } from '@/features/recipes/api/get-saved-recipes';
import type { SavedRecipeListData } from '@/features/recipes/types';

interface SavedRecipeListState extends SavedRecipeListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SavedRecipeListState = {
  requestKey: null,
  recipes: [],
  pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useSavedRecipes(queryString: string) {
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

    void getSavedRecipes(request, queryString, controller.signal)
      .then(({ recipes, pagination }) => {
        setState({
          requestKey: queryString,
          recipes,
          pagination,
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
          isLoading: false,
          error: error instanceof Error ? error.message : 'Saved recipes could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, request, requestVersion]);

  return {
    recipes: isCurrentRequest ? state.recipes : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
