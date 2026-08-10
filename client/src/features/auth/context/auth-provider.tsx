import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AuthContext, type AuthStatus } from '@/features/auth/context/auth-context';
import {
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  register,
} from '@/features/auth/api/auth';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@/features/auth/types';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'loading',
};

let sessionRestoreRequest: Promise<AuthSession | null> | null = null;

function restoreSession() {
  sessionRestoreRequest ??= refreshAccessToken()
    .then(async (accessToken) => ({
      accessToken,
      user: await getCurrentUser(accessToken),
    }))
    .catch(() => null);

  return sessionRestoreRequest;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState(initialState);
  const tokenRenewalRequest = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let isActive = true;

    void restoreSession().then((session) => {
      if (!isActive) return;

      setState(
        session === null
          ? { user: null, accessToken: null, status: 'unauthenticated' }
          : { ...session, status: 'authenticated' },
      );
    });

    return () => {
      isActive = false;
    };
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const session = await login(input);
    sessionRestoreRequest = Promise.resolve(session);
    setState({ ...session, status: 'authenticated' });

    return session;
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const session = await register(input);
    sessionRestoreRequest = Promise.resolve(session);
    setState({ ...session, status: 'authenticated' });

    return session;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    sessionRestoreRequest = null;
    setState({ user: null, accessToken: null, status: 'unauthenticated' });
  }, []);

  const renewAccessToken = useCallback(async () => {
    tokenRenewalRequest.current ??= refreshAccessToken()
      .then((accessToken) => {
        sessionRestoreRequest = null;
        setState((current) => ({ ...current, accessToken }));
        return accessToken;
      })
      .catch((error: unknown) => {
        sessionRestoreRequest = null;
        setState({ user: null, accessToken: null, status: 'unauthenticated' });
        throw error;
      })
      .finally(() => {
        tokenRenewalRequest.current = null;
      });

    return tokenRenewalRequest.current;
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signUp, signOut, renewAccessToken }),
    [renewAccessToken, signIn, signOut, signUp, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
