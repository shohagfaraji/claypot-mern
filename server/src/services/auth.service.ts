import { AppError } from '../errors/app-error.js';
import { hashPassword } from '../lib/password.js';
import { UserModel } from '../models/user.model.js';
import type { RegisterInput } from '../schemas/auth.schema.js';

export interface RegisteredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: Date;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function registerUser(input: RegisterInput): Promise<RegisteredUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await UserModel.create({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        409,
        'ACCOUNT_ALREADY_EXISTS',
        'An account with that email or username already exists.',
        { cause: error },
      );
    }

    throw error;
  }
}
