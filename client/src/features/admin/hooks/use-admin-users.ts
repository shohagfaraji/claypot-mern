import { useCallback, useEffect, useState } from 'react';

import { getAdminUsers } from '@/features/admin/api/get-admin-users';
import type { AdminUserListData } from '@/features/admin/types';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';

interface AdminUserListState extends AdminUserListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminUserListState = {
  requestKey: null,
  users: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useAdminUsers(queryString: string) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === queryString;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getAdminUsers(request, queryString, controller.signal)
      .then(({ users, pagination }) => {
        setState({
          requestKey: queryString,
          users,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: queryString,
          users: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Members could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, request, requestVersion]);

  return {
    users: isCurrentRequest ? state.users : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
