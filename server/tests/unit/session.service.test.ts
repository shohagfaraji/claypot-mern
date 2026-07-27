import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAccessTokenMock,
  createRefreshTokenMock,
  hashRefreshTokenMock,
  createRefreshSessionMock,
} = vi.hoisted(() => ({
  createAccessTokenMock: vi.fn(),
  createRefreshTokenMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  createRefreshSessionMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  createAccessToken: createAccessTokenMock,
}));

vi.mock('../../src/lib/refresh-token.js', () => ({
  createRefreshToken: createRefreshTokenMock,
  hashRefreshToken: hashRefreshTokenMock,
}));

vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    create: createRefreshSessionMock,
  },
}));

import { createAuthSession } from '../../src/services/session.service.js';

describe('session service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T08:00:00.000Z'));
    vi.resetAllMocks();

    createAccessTokenMock.mockResolvedValue('signed-access-token');
    createRefreshTokenMock.mockReturnValue('raw-refresh-token');
    hashRefreshTokenMock.mockReturnValue('a'.repeat(64));
    createRefreshSessionMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates and persists a refresh session', async () => {
    const session = await createAuthSession(
      {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      {
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      },
    );

    const expectedExpiration = new Date('2026-08-03T08:00:00.000Z');

    expect(createAccessTokenMock).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    expect(hashRefreshTokenMock).toHaveBeenCalledWith('raw-refresh-token');
    expect(createRefreshSessionMock).toHaveBeenCalledWith({
      user: '507f1f77bcf86cd799439011',
      tokenHash: 'a'.repeat(64),
      expiresAt: expectedExpiration,
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });
    expect(createRefreshSessionMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: 'raw-refresh-token',
      }),
    );
    expect(session).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: 'raw-refresh-token',
      refreshTokenExpiresAt: expectedExpiration,
    });
  });

  it('stores nullable metadata when request details are unavailable', async () => {
    await createAuthSession({
      userId: '507f1f77bcf86cd799439011',
      role: 'admin',
    });

    expect(createRefreshSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: null,
        ipAddress: null,
      }),
    );
  });

  it('preserves persistence failures', async () => {
    const databaseError = new Error('Database unavailable');

    createRefreshSessionMock.mockRejectedValue(databaseError);

    await expect(
      createAuthSession({
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      }),
    ).rejects.toBe(databaseError);
  });
});
