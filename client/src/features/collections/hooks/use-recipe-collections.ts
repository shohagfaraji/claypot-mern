import { useCallback, useEffect, useState } from 'react';

import { getRecipeCollections } from '@/features/collections/api/collections';
import type { RecipeCollection } from '@/features/collections/types';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';

interface CollectionListState {
  collections: RecipeCollection[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CollectionListState = {
  collections: [],
  isLoading: true,
  error: null,
};

export function useRecipeCollections() {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getRecipeCollections(request, controller.signal)
      .then((collections) => {
        setState({ collections, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          collections: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Recipe collections could not load.',
        });
      });

    return () => controller.abort();
  }, [request, requestVersion]);

  return { ...state, retry };
}
