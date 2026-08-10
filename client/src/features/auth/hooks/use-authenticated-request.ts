import { useCallback } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { ApiError, apiRequest } from '@/lib/api-client';

export function useAuthenticatedRequest() {
  const { accessToken, renewAccessToken } = useAuth();

  return useCallback(
    async function authenticatedRequest<T>(path: string, init?: RequestInit) {
      if (accessToken === null) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
      }

      const send = (token: string) => {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return apiRequest<T>(path, { ...init, headers });
      };

      try {
        return await send(accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const renewedAccessToken = await renewAccessToken();
        return send(renewedAccessToken);
      }
    },
    [accessToken, renewAccessToken],
  );
}
