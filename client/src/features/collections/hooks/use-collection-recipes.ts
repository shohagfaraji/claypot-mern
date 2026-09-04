import { useCallback, useEffect, useState } from 'react';

import { getCollectionRecipes } from '@/features/collections/api/collections';
import type { CollectionRecipeListData } from '@/features/collections/types';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { ApiError } from '@/lib/api-client';

interface CollectionRecipeListState extends Omit<CollectionRecipeListData, 'collection'> {
  requestKey: string | null;
  collection: CollectionRecipeListData['collection'] | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
}

const initialState: CollectionRecipeListState = {
  requestKey: null,
  collection: null,
  recipes: [],
  pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
  isNotFound: false,
};

export function useCollectionRecipes(collectionId: string, queryString: string) {
  const request = useAuthenticatedRequest();
  const requestKey = `${collectionId}:${queryString}`;
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === requestKey;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getCollectionRecipes(request, collectionId, queryString, controller.signal)
      .then(({ collection, recipes, pagination }) => {
        setState({
          requestKey,
          collection,
          recipes,
          pagination,
          isLoading: false,
          error: null,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          ...initialState,
          requestKey,
          isLoading: false,
          error: error instanceof Error ? error.message : 'The collection could not load.',
          isNotFound: error instanceof ApiError && error.status === 404,
        });
      });

    return () => controller.abort();
  }, [collectionId, queryString, request, requestKey, requestVersion]);

  return {
    collection: isCurrentRequest ? state.collection : null,
    recipes: isCurrentRequest ? state.recipes : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    isNotFound: isCurrentRequest && state.isNotFound,
    retry,
  };
}
