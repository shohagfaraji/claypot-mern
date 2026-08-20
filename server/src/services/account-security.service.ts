import { startSession } from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createRefreshToken, hashRefreshToken } from '../lib/refresh-token.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { UserModel } from '../models/user.model.js';
import type { ChangePasswordInput } from '../schemas/auth.schema.js';
import type { SessionMetadata } from './session.service.js';

const millisecondsPerDay = 24 * 60 * 60 * 1_000;

export interface ChangedPasswordSession {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export async function changeAccountPassword(
  userId: string,
  currentRefreshToken: string,
  input: ChangePasswordInput,
  metadata: SessionMetadata = {},
): Promise<ChangedPasswordSession> {
  const now = new Date();
  const currentTokenHash = hashRefreshToken(currentRefreshToken);
  const refreshToken = createRefreshToken();
  const replacementTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * millisecondsPerDay,
  );
  const session = await startSession();
  let changed = false;

  try {
    await session.withTransaction(async () => {
      const currentSession = await RefreshSessionModel.findOne(
        {
          user: userId,
          tokenHash: currentTokenHash,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        null,
        { session },
      );

      if (currentSession === null) {
        throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
      }

      const user = await UserModel.findById(userId, null, { session }).select('+passwordHash');
      if (user === null) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
      }

      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
      }

      user.passwordHash = await hashPassword(input.newPassword);
      currentSession.tokenHash = replacementTokenHash;
      currentSession.expiresAt = refreshTokenExpiresAt;
      currentSession.lastUsedAt = now;
      if (metadata.userAgent !== undefined) currentSession.userAgent = metadata.userAgent;
      if (metadata.ipAddress !== undefined) currentSession.ipAddress = metadata.ipAddress;

      await user.save({ session });
      await currentSession.save({ session });
      await RefreshSessionModel.updateMany(
        { user: userId, _id: { $ne: currentSession._id }, revokedAt: null },
        { $set: { revokedAt: now } },
        { session },
      );
      changed = true;
    });
  } finally {
    await session.endSession();
  }

  if (!changed) throw new Error('Password change did not complete.');

  return { refreshToken, refreshTokenExpiresAt };
}
