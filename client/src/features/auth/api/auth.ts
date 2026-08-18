import type {
  AuthSession,
  AuthUser,
  EmailVerificationRequestStatus,
  EmailVerificationStatus,
  LoginInput,
  RegisterInput,
  RegistrationSession,
  UpdateProfileInput,
} from '@/features/auth/types';
import { apiRequest } from '@/lib/api-client';

interface LoginResponse {
  data: AuthSession;
}

interface RegisterResponse {
  data: RegistrationSession;
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

interface EmailVerificationRequestResponse {
  data: {
    status: EmailVerificationRequestStatus;
  };
}

interface EmailVerificationResponse {
  data: {
    status: EmailVerificationStatus;
  };
}

const verificationRequests = new Map<string, Promise<EmailVerificationStatus>>();

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

export async function getAuthenticatedCurrentUser(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const response = await request<CurrentUserResponse>('/auth/me');
  return response.data.user;
}

export async function resendVerificationEmail(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const response = await request<EmailVerificationRequestResponse>(
    '/auth/email-verification/resend',
    { method: 'POST' },
  );

  return response.data.status;
}

export function verifyEmailAddress(token: string) {
  const existingRequest = verificationRequests.get(token);
  if (existingRequest !== undefined) return existingRequest;

  const request = apiRequest<EmailVerificationResponse>('/auth/email-verification/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then((response) => response.data.status);

  verificationRequests.set(token, request);
  return request;
}
