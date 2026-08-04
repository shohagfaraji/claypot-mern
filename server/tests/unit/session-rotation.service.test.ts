import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAccessTokenMock,
  createRefreshTokenMock,
  findSessionMock,
  findUserMock,
  hashRefreshTokenMock,
  rotateSessionMock,
  selectUserRoleMock,
} = vi.hoisted(() => ({
  createAccessTokenMock: vi.fn(),
  createRefreshTokenMock: vi.fn(),
  findSessionMock: vi.fn(),
  findUserMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  rotateSessionMock: vi.fn(),
  selectUserRoleMock: vi.fn(),
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
    findOne: findSessionMock,
    findOneAndUpdate: rotateSessionMock,
  },
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    findById: findUserMock,
  },
}));

import { rotateAuthSession } from '../../src/services/session.service.js';

describe('session rotation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T08:00:00.000Z'));
    vi.resetAllMocks();

    hashRefreshTokenMock.mockReturnValueOnce('a'.repeat(64)).mockReturnValueOnce('b'.repeat(64));
    findSessionMock.mockResolvedValue({
      _id: 'session-id',
      user: 'user-id',
    });
    findUserMock.mockReturnValue({ select: selectUserRoleMock });
    selectUserRoleMock.mockResolvedValue({ id: 'user-id', role: 'user' });
    createAccessTokenMock.mockResolvedValue('new-access-token');
    createRefreshTokenMock.mockReturnValue('new-refresh-token');
    rotateSessionMock.mockResolvedValue({ _id: 'session-id' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('atomically replaces the current refresh token', async () => {
    const session = await rotateAuthSession('current-refresh-token', {
      userAgent: 'Claypot test browser',
      ipAddress: '127.0.0.1',
    });
    const now = new Date('2026-08-05T08:00:00.000Z');
    const expiresAt = new Date('2026-08-12T08:00:00.000Z');

    expect(findSessionMock).toHaveBeenCalledWith({
      tokenHash: 'a'.repeat(64),
      revokedAt: null,
      expiresAt: { $gt: now },
    });
    expect(rotateSessionMock).toHaveBeenCalledWith(
      {
        _id: 'session-id',
        tokenHash: 'a'.repeat(64),
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          tokenHash: 'b'.repeat(64),
          expiresAt,
          lastUsedAt: now,
          userAgent: 'Claypot test browser',
          ipAddress: '127.0.0.1',
        },
      },
      { new: true },
    );
    expect(session).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresAt: expiresAt,
    });
  });

  it('rejects an unknown or expired refresh token', async () => {
    hashRefreshTokenMock.mockReset().mockReturnValue('a'.repeat(64));
    findSessionMock.mockResolvedValue(null);

    await expect(rotateAuthSession('invalid-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_SESSION',
    });
    expect(createAccessTokenMock).not.toHaveBeenCalled();
    expect(rotateSessionMock).not.toHaveBeenCalled();
  });

  it('rejects a refresh token that loses a concurrent rotation', async () => {
    rotateSessionMock.mockResolvedValue(null);

    await expect(rotateAuthSession('current-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_SESSION',
    });
  });
});
