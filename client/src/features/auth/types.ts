export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

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
  bio: string | null;
}
