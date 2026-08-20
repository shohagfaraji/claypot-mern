import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRefreshTokenMock,
  endSessionMock,
  findRefreshSessionMock,
  findUserMock,
  hashPasswordMock,
  hashRefreshTokenMock,
  saveRefreshSessionMock,
  saveUserMock,
  selectPasswordMock,
  startSessionMock,
  updateSessionsMock,
  verifyPasswordMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  createRefreshTokenMock: vi.fn(),
  endSessionMock: vi.fn(),
  findRefreshSessionMock: vi.fn(),
  findUserMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  saveRefreshSessionMock: vi.fn(),
  saveUserMock: vi.fn(),
  selectPasswordMock: vi.fn(),
  startSessionMock: vi.fn(),
  updateSessionsMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', () => ({ startSession: startSessionMock }));
vi.mock('../../src/lib/password.js', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));
vi.mock('../../src/lib/refresh-token.js', () => ({
  createRefreshToken: createRefreshTokenMock,
  hashRefreshToken: hashRefreshTokenMock,
}));
vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    findOne: findRefreshSessionMock,
    updateMany: updateSessionsMock,
  },
}));
vi.mock('../../src/models/user.model.js', () => ({
  UserModel: { findById: findUserMock },
}));

import { changeAccountPassword } from '../../src/services/account-security.service.js';

describe('account security service', () => {
  const currentSession = {
    _id: 'current-session-id',
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(),
    lastUsedAt: null,
    userAgent: null,
    ipAddress: null,
    save: saveRefreshSessionMock,
  };
  const user = {
    passwordHash: 'stored-password-hash',
    save: saveUserMock,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T08:00:00.000Z'));
    vi.resetAllMocks();
    withTransactionMock.mockImplementation(async (callback: () => Promise<void>) => callback());
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    createRefreshTokenMock.mockReturnValue('replacement-refresh-token');
    hashRefreshTokenMock.mockReturnValueOnce('a'.repeat(64)).mockReturnValueOnce('b'.repeat(64));
    findRefreshSessionMock.mockResolvedValue(currentSession);
    findUserMock.mockReturnValue({ select: selectPasswordMock });
    selectPasswordMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue('replacement-password-hash');
    updateSessionsMock.mockResolvedValue({ modifiedCount: 2 });
  });

  afterEach(() => vi.useRealTimers());

  it('changes the password, rotates the current token, and revokes other sessions', async () => {
    const result = await changeAccountPassword(
      'user-id',
      'current-refresh-token',
      { currentPassword: 'Claypot9', newPassword: 'NewClaypot9' },
      { userAgent: 'Claypot test browser', ipAddress: '127.0.0.1' },
    );

    expect(verifyPasswordMock).toHaveBeenCalledWith('Claypot9', 'stored-password-hash');
    expect(hashPasswordMock).toHaveBeenCalledWith('NewClaypot9');
    expect(user.passwordHash).toBe('replacement-password-hash');
    expect(currentSession).toMatchObject({
      tokenHash: 'b'.repeat(64),
      expiresAt: new Date('2026-08-26T08:00:00.000Z'),
      lastUsedAt: new Date('2026-08-19T08:00:00.000Z'),
      userAgent: 'Claypot test browser',
      ipAddress: '127.0.0.1',
    });
    expect(saveUserMock).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(saveRefreshSessionMock).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(updateSessionsMock).toHaveBeenCalledWith(
      { user: 'user-id', _id: { $ne: 'current-session-id' }, revokedAt: null },
      { $set: { revokedAt: new Date('2026-08-19T08:00:00.000Z') } },
      { session: expect.any(Object) },
    );
    expect(result).toEqual({
      refreshToken: 'replacement-refresh-token',
      refreshTokenExpiresAt: new Date('2026-08-26T08:00:00.000Z'),
    });
    expect(endSessionMock).toHaveBeenCalled();
  });

  it('rejects an incorrect current password without changing account state', async () => {
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      changeAccountPassword('user-id', 'current-refresh-token', {
        currentPassword: 'Incorrect9',
        newPassword: 'NewClaypot9',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CURRENT_PASSWORD' });
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(saveUserMock).not.toHaveBeenCalled();
    expect(updateSessionsMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalled();
  });
});
