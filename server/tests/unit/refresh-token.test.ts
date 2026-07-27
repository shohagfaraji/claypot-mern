import { describe, expect, it } from 'vitest';
import {
  createRefreshToken,
  getRefreshTokenCookieOptions,
  hashRefreshToken,
  refreshTokenCookieName,
} from '../../src/lib/refresh-token.js';

describe('refresh token utilities', () => {
  it('creates unique opaque tokens with sufficient entropy', () => {
    const firstToken = createRefreshToken();
    const secondToken = createRefreshToken();

    expect(firstToken).toHaveLength(64);
    expect(secondToken).toHaveLength(64);
    expect(firstToken).not.toBe(secondToken);
    expect(firstToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('creates deterministic SHA-256 hashes without retaining the token', () => {
    const token = createRefreshToken();
    const firstHash = hashRefreshToken(token);
    const secondHash = hashRefreshToken(token);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
    expect(firstHash).toMatch(/^[a-f0-9]+$/);
    expect(firstHash).not.toContain(token);
  });

  it('uses an HttpOnly, same-site cookie in development', () => {
    expect(
      getRefreshTokenCookieOptions({
        NODE_ENV: 'development',
        REFRESH_TOKEN_TTL_DAYS: 7,
      }),
    ).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 604_800_000,
    });
    expect(refreshTokenCookieName).toBe('claypot_refresh');
  });

  it('requires HTTPS cookies in production', () => {
    expect(
      getRefreshTokenCookieOptions({
        NODE_ENV: 'production',
        REFRESH_TOKEN_TTL_DAYS: 30,
      }),
    ).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 2_592_000_000,
    });
  });
});
