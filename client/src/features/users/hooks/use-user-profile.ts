import { useCallback, useEffect, useState } from 'react';

import { getUserProfile } from '@/features/users/api/get-user-profile';
import type { PublicUserProfile } from '@/features/users/types';
import { ApiError } from '@/lib/api-client';

interface UserProfileState {
  requestKey: string | null;
  user: PublicUserProfile | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
}

const initialState: UserProfileState = {
  requestKey: null,
  user: null,
  isLoading: true,
  error: null,
  isNotFound: false,
};

export function useUserProfile(username: string) {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);
  const isCurrentRequest = state.requestKey === username;

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getUserProfile(username, controller.signal)
      .then((user) => {
        setState({
          requestKey: username,
          user,
          isLoading: false,
          error: null,
          isNotFound: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: username,
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'The cook profile could not be loaded.',
          isNotFound: error instanceof ApiError && error.status === 404,
        });
      });

    return () => controller.abort();
  }, [requestVersion, username]);

  return {
    user: isCurrentRequest ? state.user : null,
    isLoading: !isCurrentRequest || state.isLoading,
    error: isCurrentRequest ? state.error : null,
    isNotFound: isCurrentRequest && state.isNotFound,
    retry,
  };
}
