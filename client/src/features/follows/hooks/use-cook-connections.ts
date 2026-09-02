import { useCallback, useEffect, useState } from 'react';

import { getCookConnections } from '@/features/follows/api/follows';
import type { CookConnectionListData, CookConnectionType } from '@/features/follows/types';
import { ApiError } from '@/lib/api-client';

interface CookConnectionListState extends CookConnectionListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
}

const initialState: CookConnectionListState = {
  requestKey: null,
  cooks: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
  isNotFound: false,
};

export function useCookConnections(
  username: string,
  connection: CookConnectionType,
  queryString: string,
) {
  const requestKey = `${username}:${connection}:${queryString}`;
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === requestKey;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getCookConnections(username, connection, queryString, controller.signal)
      .then(({ cooks, pagination }) => {
        setState({
          requestKey,
          cooks,
          pagination,
          isLoading: false,
          error: null,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestKey,
          cooks: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Cook connections could not be loaded.',
          isNotFound: error instanceof ApiError && error.status === 404,
        });
      });

    return () => controller.abort();
  }, [connection, queryString, requestKey, requestVersion, username]);

  return {
    cooks: isCurrentRequest ? state.cooks : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    isNotFound: isCurrentRequest && state.isNotFound,
    retry,
  };
}
