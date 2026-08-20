import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findSessionMock,
  findSessionsMock,
  hashRefreshTokenMock,
  revokeSessionMock,
  selectSessionsMock,
  sortSessionsMock,
  updateSessionsMock,
} = vi.hoisted(() => ({
  findSessionMock: vi.fn(),
  findSessionsMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  revokeSessionMock: vi.fn(),
  selectSessionsMock: vi.fn(),
  sortSessionsMock: vi.fn(),
  updateSessionsMock: vi.fn(),
}));

vi.mock('../../src/lib/refresh-token.js', () => ({
  createRefreshToken: vi.fn(),
  hashRefreshToken: hashRefreshTokenMock,
}));

vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    find: findSessionsMock,
    findOne: findSessionMock,
    findOneAndUpdate: revokeSessionMock,
    updateMany: updateSessionsMock,
  },
}));

import {
  listUserAuthSessions,
  revokeOtherUserAuthSessions,
  revokeUserAuthSession,
} from '../../src/services/session.service.js';

describe('account session management', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T08:00:00.000Z'));
    vi.resetAllMocks();
    hashRefreshTokenMock.mockReturnValue('a'.repeat(64));
    findSessionsMock.mockReturnValue({ select: selectSessionsMock });
    selectSessionsMock.mockReturnValue({ sort: sortSessionsMock });
  });

  afterEach(() => vi.useRealTimers());

  it('lists active sessions without exposing stored hashes', async () => {
    sortSessionsMock.mockResolvedValue([
      {
        id: 'current-session-id',
        tokenHash: 'a'.repeat(64),
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0 Safari/537.36',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2026-08-10T08:00:00.000Z'),
        lastUsedAt: new Date('2026-08-19T07:00:00.000Z'),
        expiresAt: new Date('2026-08-26T08:00:00.000Z'),
      },
    ]);

    const sessions = await listUserAuthSessions('user-id', 'current-token');

    expect(findSessionsMock).toHaveBeenCalledWith({
      user: 'user-id',
      revokedAt: null,
      expiresAt: { $gt: new Date('2026-08-19T08:00:00.000Z') },
    });
    expect(sessions).toEqual([
      {
        id: 'current-session-id',
        device: 'Chrome on Linux',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2026-08-10T08:00:00.000Z'),
        lastActiveAt: new Date('2026-08-19T07:00:00.000Z'),
        expiresAt: new Date('2026-08-26T08:00:00.000Z'),
        isCurrent: true,
      },
    ]);
    expect(sessions[0]).not.toHaveProperty('tokenHash');
  });

  it('rejects session listings without a matching current refresh token', async () => {
    sortSessionsMock.mockResolvedValue([]);

    await expect(listUserAuthSessions('user-id', 'invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_SESSION',
    });
  });

  it('revokes only another active session owned by the account', async () => {
    revokeSessionMock.mockResolvedValue({ id: 'other-session-id' });

    await expect(
      revokeUserAuthSession('user-id', 'other-session-id', 'current-token'),
    ).resolves.toBeUndefined();
    expect(revokeSessionMock).toHaveBeenCalledWith(
      {
        _id: 'other-session-id',
        user: 'user-id',
        tokenHash: { $ne: 'a'.repeat(64) },
        revokedAt: null,
        expiresAt: { $gt: new Date('2026-08-19T08:00:00.000Z') },
      },
      { $set: { revokedAt: new Date('2026-08-19T08:00:00.000Z') } },
    );
  });

  it('preserves the current session while revoking all others', async () => {
    findSessionMock.mockResolvedValue({ _id: 'current-session-id' });
    updateSessionsMock.mockResolvedValue({ modifiedCount: 2 });

    await expect(revokeOtherUserAuthSessions('user-id', 'current-token')).resolves.toBe(2);
    expect(updateSessionsMock).toHaveBeenCalledWith(
      {
        user: 'user-id',
        _id: { $ne: 'current-session-id' },
        revokedAt: null,
        expiresAt: { $gt: new Date('2026-08-19T08:00:00.000Z') },
      },
      { $set: { revokedAt: new Date('2026-08-19T08:00:00.000Z') } },
    );
  });
});
