import { createContext } from 'react';

import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegistrationSession,
} from '@/features/auth/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<AuthSession>;
  signUp: (input: RegisterInput) => Promise<RegistrationSession>;
  signOut: () => Promise<void>;
  clearSession: () => void;
  renewAccessToken: () => Promise<string>;
  updateSessionUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
