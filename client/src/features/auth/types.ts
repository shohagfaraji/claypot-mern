export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface RegistrationSession extends AuthSession {
  verificationEmailSent: boolean;
}

export type EmailVerificationRequestStatus = 'sent' | 'already_verified';
export type EmailVerificationStatus = 'verified' | 'already_verified';

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name: string;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  bio: string | null;
}
