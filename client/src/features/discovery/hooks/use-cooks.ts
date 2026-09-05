import { useCallback, useEffect, useState } from 'react';

import { getDiscoverableCooks } from '@/features/discovery/api/discovery';
import type { CookDiscoveryData } from '@/features/discovery/types';

interface CookDiscoveryState extends CookDiscoveryData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CookDiscoveryState = {
  requestKey: null,
  cooks: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useCooks(queryString: string) {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === queryString;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getDiscoverableCooks(queryString, controller.signal)
      .then(({ cooks, pagination }) => {
        setState({
          requestKey: queryString,
          cooks,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestKey: queryString,
          cooks: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Cooks could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, requestVersion]);

  return {
    cooks: isCurrentRequest ? state.cooks : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
