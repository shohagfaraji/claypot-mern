import { env } from '../config/env.js';
import { createAccessToken, type AccessTokenIdentity } from '../lib/access-token.js';
import { createRefreshToken, hashRefreshToken } from '../lib/refresh-token.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';

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
