import { useCallback, useEffect, useState } from 'react';

import { getRecipes } from '@/features/recipes/api/get-recipes';
import type { RecipeListItem } from '@/features/recipes/types';

interface FeaturedRecipesState {
  recipes: RecipeListItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FeaturedRecipesState = {
  recipes: [],
  isLoading: true,
  error: null,
};

export function useFeaturedRecipes() {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getRecipes(controller.signal)
      .then(({ recipes }) => {
        setState({ recipes, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          recipes: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Recipes could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [requestVersion]);

  return { ...state, retry };
}
