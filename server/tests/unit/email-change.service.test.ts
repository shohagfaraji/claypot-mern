import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteEmailChangeMock,
  deleteExpiredMock,
  deleteVerificationMock,
  endSessionMock,
  findEmailChangeMock,
  findEmailChangeAndUpdateMock,
  findRefreshSessionMock,
  findUserByIdMock,
  findUserMock,
  pendingExistsMock,
  selectPendingMock,
  selectUserMock,
  sendMessageMock,
  startSessionMock,
  updateSessionsMock,
  userExistsMock,
  verifyPasswordMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  deleteEmailChangeMock: vi.fn(),
  deleteExpiredMock: vi.fn(),
  deleteVerificationMock: vi.fn(),
  endSessionMock: vi.fn(),
  findEmailChangeMock: vi.fn(),
  findEmailChangeAndUpdateMock: vi.fn(),
  findRefreshSessionMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  findUserMock: vi.fn(),
  pendingExistsMock: vi.fn(),
  selectPendingMock: vi.fn(),
  selectUserMock: vi.fn(),
  sendMessageMock: vi.fn(),
  startSessionMock: vi.fn(),
  updateSessionsMock: vi.fn(),
  userExistsMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    EMAIL_CHANGE_TOKEN_TTL_HOURS: 24,
    EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS: 60,
  },
}));

vi.mock('../../src/lib/password.js', () => ({ verifyPassword: verifyPasswordMock }));
vi.mock('../../src/models/email-change-token.model.js', () => ({
  EmailChangeTokenModel: {
    deleteMany: deleteExpiredMock,
    deleteOne: deleteEmailChangeMock,
    exists: pendingExistsMock,
    findOne: findEmailChangeMock,
    findOneAndUpdate: findEmailChangeAndUpdateMock,
  },
}));
vi.mock('../../src/models/email-verification-token.model.js', () => ({
  EmailVerificationTokenModel: { deleteOne: deleteVerificationMock },
}));
vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    findOne: findRefreshSessionMock,
    updateMany: updateSessionsMock,
  },
}));
vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    exists: userExistsMock,
    findById: findUserByIdMock,
    findOne: findUserMock,
  },
}));
vi.mock('../../src/services/email.service.js', () => ({
  sendEmailChangeMessage: sendMessageMock,
}));

import { confirmEmailChange, requestEmailChange } from '../../src/services/email-change.service.js';

const userId = '507f1f77bcf86cd799439011';

describe('email change service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T08:00:00.000Z'));
    vi.resetAllMocks();
    deleteExpiredMock.mockResolvedValue({ deletedCount: 0 });
    deleteEmailChangeMock.mockResolvedValue({ deletedCount: 1 });
    userExistsMock.mockResolvedValue(null);
    pendingExistsMock.mockResolvedValue(null);
    findEmailChangeAndUpdateMock.mockResolvedValue({ id: 'pending-id' });
    sendMessageMock.mockResolvedValue(undefined);
    findEmailChangeMock.mockReturnValue({ select: selectPendingMock });
    selectPendingMock.mockResolvedValue({
      pendingEmail: 'new@example.com',
      expiresAt: new Date('2026-08-22T08:00:00.000Z'),
      updatedAt: new Date('2026-08-21T08:00:00.000Z'),
    });
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
  });

  afterEach(() => vi.useRealTimers());

  it('verifies the current password and sends a hashed, expiring request', async () => {
    const user = {
      _id: new Types.ObjectId(userId),
      name: 'Amina Rahman',
      email: 'old@example.com',
      passwordHash: 'stored-password-hash',
    };
    findUserByIdMock.mockReturnValue({ select: selectUserMock });
    selectUserMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(true);

    await expect(requestEmailChange(userId, 'new@example.com', 'Claypot9')).resolves.toEqual({
      email: 'new@example.com',
      expiresAt: new Date('2026-08-22T08:00:00.000Z'),
      canResendAt: new Date('2026-08-21T08:01:00.000Z'),
    });

    const storedUpdate = findEmailChangeAndUpdateMock.mock.calls[0]?.[1] as {
      $set: { tokenHash: string; pendingEmail: string; expiresAt: Date };
    };
    const sentMessage = sendMessageMock.mock.calls[0]?.[0] as { token: string };
    expect(verifyPasswordMock).toHaveBeenCalledWith('Claypot9', 'stored-password-hash');
    expect(storedUpdate.$set).toMatchObject({ pendingEmail: 'new@example.com' });
    expect(storedUpdate.$set.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedUpdate.$set.expiresAt).toEqual(new Date('2026-08-22T08:00:00.000Z'));
    expect(sentMessage.token).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(sentMessage.token).not.toBe(storedUpdate.$set.tokenHash);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: 'new@example.com' }),
    );
  });

  it('rejects an incorrect password before reserving an email', async () => {
    findUserByIdMock.mockReturnValue({ select: selectUserMock });
    selectUserMock.mockResolvedValue({
      _id: new Types.ObjectId(userId),
      email: 'old@example.com',
      passwordHash: 'stored-password-hash',
    });
    verifyPasswordMock.mockResolvedValue(false);

    await expect(requestEmailChange(userId, 'new@example.com', 'Incorrect9')).rejects.toMatchObject(
      { statusCode: 400, code: 'INVALID_CURRENT_PASSWORD' },
    );
    expect(findEmailChangeAndUpdateMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('enforces the resend cooldown across competing requests', async () => {
    findUserByIdMock.mockReturnValue({ select: selectUserMock });
    selectUserMock.mockResolvedValue({
      _id: new Types.ObjectId(userId),
      name: 'Amina Rahman',
      email: 'old@example.com',
      passwordHash: 'stored-password-hash',
    });
    verifyPasswordMock.mockResolvedValue(true);
    pendingExistsMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: 'pending-id' });
    findEmailChangeAndUpdateMock.mockRejectedValue({ code: 11000 });

    await expect(requestEmailChange(userId, 'new@example.com', 'Claypot9')).rejects.toMatchObject({
      statusCode: 429,
      code: 'EMAIL_CHANGE_COOLDOWN',
    });
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('confirms the new address once and revokes every other session', async () => {
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const user = {
      _id: new Types.ObjectId(userId),
      name: 'Amina Rahman',
      email: 'old@example.com',
      isEmailVerified: false,
      save: saveUserMock,
    };
    findEmailChangeAndUpdateMock.mockResolvedValue({
      user: user._id,
      pendingEmail: 'new@example.com',
    });
    findUserByIdMock.mockResolvedValue(user);
    findUserMock.mockResolvedValue(null);
    findRefreshSessionMock.mockResolvedValue({ _id: 'current-session-id' });
    deleteVerificationMock.mockResolvedValue({ deletedCount: 1 });
    updateSessionsMock.mockResolvedValue({ modifiedCount: 2 });

    await expect(confirmEmailChange('a'.repeat(43), 'current-refresh-token')).resolves.toEqual({
      status: 'changed',
      currentSessionPreserved: true,
      previousEmail: 'old@example.com',
      recipientName: 'Amina Rahman',
    });

    expect(user.email).toBe('new@example.com');
    expect(user.isEmailVerified).toBe(true);
    expect(saveUserMock).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(deleteVerificationMock).toHaveBeenCalledWith(
      { user: user._id },
      { session: expect.any(Object) },
    );
    expect(updateSessionsMock).toHaveBeenCalledWith(
      { user: user._id, revokedAt: null, _id: { $ne: 'current-session-id' } },
      { $set: { revokedAt: new Date('2026-08-21T08:00:00.000Z') } },
      { session: expect.any(Object) },
    );
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('rejects an invalid, expired, or already consumed confirmation token', async () => {
    findEmailChangeAndUpdateMock.mockResolvedValue(null);

    await expect(confirmEmailChange('a'.repeat(43))).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_EMAIL_CHANGE_TOKEN',
    });
    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(updateSessionsMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });
});
