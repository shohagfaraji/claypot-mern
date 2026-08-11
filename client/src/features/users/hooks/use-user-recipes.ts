import { useCallback, useEffect, useState } from 'react';

import { getUserRecipes } from '@/features/users/api/get-user-recipes';
import type { UserRecipeListData } from '@/features/users/types';

interface UserRecipeListState extends UserRecipeListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserRecipeListState = {
  requestKey: null,
  recipes: [],
  pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useUserRecipes(username: string, queryString: string) {
  const requestKey = `${username}?${queryString}`;
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === requestKey;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getUserRecipes(username, queryString, controller.signal)
      .then(({ recipes, pagination }) => {
        setState({
          requestKey,
          recipes,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey,
          recipes: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'The cook recipes could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, requestKey, requestVersion, username]);

  return {
    recipes: isCurrentRequest ? state.recipes : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
