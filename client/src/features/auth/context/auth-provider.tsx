import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthContext, type AuthStatus } from '@/features/auth/context/auth-context';
import { getCurrentUser, login, refreshAccessToken, register } from '@/features/auth/api/auth';
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

  async function signIn(input: LoginInput) {
    const session = await login(input);
    sessionRestoreRequest = Promise.resolve(session);
    setState({ ...session, status: 'authenticated' });

    return session;
  }

  async function signUp(input: RegisterInput) {
    const session = await register(input);
    sessionRestoreRequest = Promise.resolve(session);
    setState({ ...session, status: 'authenticated' });

    return session;
  }

  const value = useMemo(() => ({ ...state, signIn, signUp }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
