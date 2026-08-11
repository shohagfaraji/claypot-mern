import { AppError } from '../errors/app-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { UserModel } from '../models/user.model.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '../schemas/auth.schema.js';

const fallbackPasswordHash = '$2b$12$EwbyiAokvt5b.KYCGIXK.ujjVDkteVub4lXR.6lG6VJFVJIUCRKPS';

export interface PublicUser {
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

function toPublicUser(user: PublicUser): PublicUser {
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
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await UserModel.create({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
    });

    return toPublicUser(user);
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

export async function authenticateUser(input: LoginInput): Promise<PublicUser> {
  const user = await UserModel.findOne({
    $or: [{ email: input.identifier }, { username: input.identifier }],
  }).select('+passwordHash');
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? fallbackPasswordHash,
  );

  if (user === null || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email, username, or password is incorrect.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return toPublicUser(user);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId).select(
    'name username email avatarUrl bio role isEmailVerified createdAt',
  );

  if (user === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  return toPublicUser(user);
}

export async function updateCurrentUser(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const user = await UserModel.findById(userId);

  if (user === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
  if (input.bio !== undefined) user.bio = input.bio;
  await user.save();

  return toPublicUser(user);
}
