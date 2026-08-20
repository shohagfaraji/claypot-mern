import type {
  AuthSession,
  AuthUser,
  AccountSession,
  ChangePasswordInput,
  EmailVerificationRequestStatus,
  EmailVerificationStatus,
  LoginInput,
  PasswordResetRequestInput,
  RegisterInput,
  RegistrationSession,
  ResetPasswordInput,
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

interface PasswordRecoveryResponse {
  data: { message: string };
}

interface AccountSessionsResponse {
  data: { sessions: AccountSession[] };
}

interface RevokedSessionsResponse {
  data: { revokedCount: number };
}

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

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

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  const response = await apiRequest<PasswordRecoveryResponse>('/auth/password-recovery/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.message;
}

export async function resendPasswordReset(input: PasswordResetRequestInput) {
  const response = await apiRequest<PasswordRecoveryResponse>('/auth/password-recovery/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.message;
}

export async function resetPassword(input: ResetPasswordInput) {
  const response = await apiRequest<PasswordRecoveryResponse>('/auth/password-recovery/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.message;
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

export async function getAuthenticatedCurrentUser(request: AuthenticatedRequest) {
  const response = await request<CurrentUserResponse>('/auth/me');
  return response.data.user;
}

export async function resendVerificationEmail(request: AuthenticatedRequest) {
  const response = await request<EmailVerificationRequestResponse>(
    '/auth/email-verification/resend',
    { method: 'POST' },
  );

  return response.data.status;
}

export async function getAccountSessions(request: AuthenticatedRequest) {
  const response = await request<AccountSessionsResponse>('/auth/sessions');
  return response.data.sessions;
}

export async function revokeAccountSession(request: AuthenticatedRequest, sessionId: string) {
  await request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function revokeOtherAccountSessions(request: AuthenticatedRequest) {
  const response = await request<RevokedSessionsResponse>('/auth/sessions', {
    method: 'DELETE',
  });
  return response.data.revokedCount;
}

export async function changeAccountPassword(
  request: AuthenticatedRequest,
  input: ChangePasswordInput,
) {
  const response = await request<PasswordRecoveryResponse>('/auth/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.message;
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
