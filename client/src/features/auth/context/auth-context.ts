import { createContext } from 'react';

import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@/features/auth/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<AuthSession>;
  signUp: (input: RegisterInput) => Promise<AuthSession>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
