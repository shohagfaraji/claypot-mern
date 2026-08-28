import { useCallback, useEffect, useState } from 'react';

import { getAdminContentReports } from '@/features/reports/api/reports';
import type { AdminContentReportListData } from '@/features/reports/types';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';

interface AdminContentReportListState extends AdminContentReportListData {
  requestKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminContentReportListState = {
  requestKey: null,
  reports: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  isLoading: true,
  error: null,
};

export function useAdminContentReports(queryString: string) {
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

    void getAdminContentReports(request, queryString, controller.signal)
      .then(({ reports, pagination }) => {
        setState({
          requestKey: queryString,
          reports,
          pagination,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: queryString,
          reports: [],
          pagination: initialState.pagination,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Content reports could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [queryString, request, requestVersion]);

  return {
    reports: isCurrentRequest ? state.reports : [],
    pagination: isCurrentRequest ? state.pagination : initialState.pagination,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    retry,
  };
}
