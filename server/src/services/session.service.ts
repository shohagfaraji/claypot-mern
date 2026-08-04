import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { createAccessToken, type AccessTokenIdentity } from '../lib/access-token.js';
import { createRefreshToken, hashRefreshToken } from '../lib/refresh-token.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { UserModel } from '../models/user.model.js';

const millisecondsPerDay = 24 * 60 * 60 * 1_000;

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export async function createAuthSession(
  identity: AccessTokenIdentity,
  metadata: SessionMetadata = {},
): Promise<AuthSession> {
  const accessToken = await createAccessToken(identity);
  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * millisecondsPerDay,
  );

  await RefreshSessionModel.create({
    user: identity.userId,
    tokenHash,
    expiresAt: refreshTokenExpiresAt,
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function rotateAuthSession(
  currentRefreshToken: string,
  metadata: SessionMetadata = {},
): Promise<AuthSession> {
  const now = new Date();
  const currentTokenHash = hashRefreshToken(currentRefreshToken);
  const currentSession = await RefreshSessionModel.findOne({
    tokenHash: currentTokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  });

  if (currentSession === null) {
    throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
  }

  const user = await UserModel.findById(currentSession.user).select('role');

  if (user === null) {
    throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
  }

  const accessToken = await createAccessToken({
    userId: user.id,
    role: user.role,
  });
  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * millisecondsPerDay,
  );
  const rotatedSession = await RefreshSessionModel.findOneAndUpdate(
    {
      _id: currentSession._id,
      tokenHash: currentTokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        tokenHash,
        expiresAt: refreshTokenExpiresAt,
        lastUsedAt: now,
        ...(metadata.userAgent === undefined ? {} : { userAgent: metadata.userAgent }),
        ...(metadata.ipAddress === undefined ? {} : { ipAddress: metadata.ipAddress }),
      },
    },
    { new: true },
  );

  if (rotatedSession === null) {
    throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
  }

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function revokeAuthSession(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshSessionModel.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}
