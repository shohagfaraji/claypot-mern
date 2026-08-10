import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getAuthorRecipe } from '@/features/recipes/api/get-author-recipe';
import type { AuthorRecipeDetail } from '@/features/recipes/types';
import { ApiError } from '@/lib/api-client';

interface AuthorRecipeState {
  requestKey: string | null;
  recipe: AuthorRecipeDetail | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
}

const initialState: AuthorRecipeState = {
  requestKey: null,
  recipe: null,
  isLoading: true,
  error: null,
  isNotFound: false,
};

export function useAuthorRecipe(recipeId: string) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === recipeId;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getAuthorRecipe(request, recipeId, controller.signal)
      .then((recipe) => {
        setState({
          requestKey: recipeId,
          recipe,
          isLoading: false,
          error: null,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: recipeId,
          recipe: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'The recipe could not be loaded.',
          isNotFound: error instanceof ApiError && error.status === 404,
        });
      });

    return () => controller.abort();
  }, [recipeId, request, requestVersion]);

  return {
    recipe: isCurrentRequest ? state.recipe : null,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    isNotFound: isCurrentRequest && state.isNotFound,
    retry,
  };
}
