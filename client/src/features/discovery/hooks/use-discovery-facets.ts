import { useCallback, useEffect, useState } from 'react';

import { getRecipeDiscoveryFacets } from '@/features/discovery/api/discovery';
import type { RecipeDiscoveryFacets } from '@/features/discovery/types';

interface DiscoveryFacetState extends RecipeDiscoveryFacets {
  isLoading: boolean;
  error: string | null;
}

const initialState: DiscoveryFacetState = {
  cuisines: [],
  categories: [],
  tags: [],
  isLoading: true,
  error: null,
};

export function useDiscoveryFacets() {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getRecipeDiscoveryFacets(controller.signal)
      .then((facets) => {
        setState({ ...facets, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          ...initialState,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Recipe filters could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [requestVersion]);

  return { ...state, retry };
}
