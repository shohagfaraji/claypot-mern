import { useCallback, useEffect, useState } from 'react';

import { getRecipes } from '@/features/recipes/api/get-recipes';
import type { RecipeListData } from '@/features/recipes/types';

interface RecipeListState extends RecipeListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RecipeListState = {
  requestKey: null,
  recipes: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useRecipes(queryString: string) {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === queryString;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getRecipes(queryString, controller.signal)
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
        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey: queryString,
          recipes: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Recipes could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, requestVersion]);

  return {
    recipes: isCurrentRequest ? state.recipes : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
