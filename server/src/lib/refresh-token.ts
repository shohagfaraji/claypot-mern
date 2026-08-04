import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';
import { env, type Environment } from '../config/env.js';

const refreshTokenBytes = 48;
const millisecondsPerDay = 24 * 60 * 60 * 1_000;

type RefreshCookieEnvironment = Pick<Environment, 'NODE_ENV' | 'REFRESH_TOKEN_TTL_DAYS'>;

export const refreshTokenCookieName = 'claypot_refresh';

export function createRefreshToken(): string {
  return randomBytes(refreshTokenBytes).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenCookieOptions(
  environment: RefreshCookieEnvironment = env,
): CookieOptions {
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: environment.REFRESH_TOKEN_TTL_DAYS * millisecondsPerDay,
  };
}

export function getClearRefreshTokenCookieOptions(
  environment: RefreshCookieEnvironment = env,
): CookieOptions {
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  };
}
