import { useCallback, useEffect, useState } from 'react';

import { getRecipe } from '@/features/recipes/api/get-recipe';
import type { RecipeDetail } from '@/features/recipes/types';
import { ApiError } from '@/lib/api-client';

interface RecipeState {
  requestKey: string | null;
  recipe: RecipeDetail | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
}

const initialState: RecipeState = {
  requestKey: null,
  recipe: null,
  isLoading: true,
  error: null,
  isNotFound: false,
};

export function useRecipe(slug: string) {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === slug;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getRecipe(slug, controller.signal)
      .then((recipe) => {
        setState({
          requestKey: slug,
          recipe,
          isLoading: false,
          error: null,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey: slug,
          recipe: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'The recipe could not be loaded.',
          isNotFound: error instanceof ApiError && error.status === 404,
        });
      });

    return () => controller.abort();
  }, [requestVersion, slug]);

  return {
    recipe: isCurrentRequest ? state.recipe : null,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    isNotFound: isCurrentRequest && state.isNotFound,
    retry,
  };
}
