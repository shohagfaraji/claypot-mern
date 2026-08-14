import { useCallback, useEffect, useState } from 'react';

import { getAdminDashboard } from '@/features/admin/api/get-admin-dashboard';
import type { AdminDashboard } from '@/features/admin/types';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';

interface AdminDashboardState {
  dashboard: AdminDashboard | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminDashboardState = {
  dashboard: null,
  isLoading: true,
  error: null,
};

export function useAdminDashboard() {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getAdminDashboard(request, controller.signal)
      .then((dashboard) => {
        setState({ dashboard, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          dashboard: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Dashboard data could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [request, requestVersion]);

  return { ...state, retry };
}
