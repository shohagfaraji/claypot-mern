import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@/features/auth/types';
import { apiRequest } from '@/lib/api-client';

interface LoginResponse {
  data: AuthSession;
}

interface RegisterResponse {
  data: AuthSession;
}

interface RefreshResponse {
  data: {
    accessToken: string;
  };
}

interface CurrentUserResponse {
  data: {
    user: AuthUser;
  };
}

export async function login(input: LoginInput) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function register(input: RegisterInput) {
  const response = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function refreshAccessToken() {
  const response = await apiRequest<RefreshResponse>('/auth/refresh', { method: 'POST' });

  return response.data.accessToken;
}

export async function getCurrentUser(accessToken: string) {
  const response = await apiRequest<CurrentUserResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data.user;
}

export async function logout() {
  await apiRequest<void>('/auth/logout', { method: 'POST' });
}

export async function updateProfile(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: UpdateProfileInput,
) {
  const response = await request<CurrentUserResponse>('/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.user;
}
