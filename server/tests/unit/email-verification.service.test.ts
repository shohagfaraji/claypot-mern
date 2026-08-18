import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteTokenMock,
  endSessionMock,
  findTokenMock,
  findTokenAndUpdateMock,
  findUserByIdMock,
  selectUserMock,
  sendMessageMock,
  startSessionMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  deleteTokenMock: vi.fn(),
  endSessionMock: vi.fn(),
  findTokenMock: vi.fn(),
  findTokenAndUpdateMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  selectUserMock: vi.fn(),
  sendMessageMock: vi.fn(),
  startSessionMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: 24,
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: 60,
  },
}));

vi.mock('../../src/models/email-verification-token.model.js', () => ({
  EmailVerificationTokenModel: {
    deleteOne: deleteTokenMock,
    findOne: findTokenMock,
    findOneAndUpdate: findTokenAndUpdateMock,
  },
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    findById: findUserByIdMock,
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendEmailVerificationMessage: sendMessageMock,
}));

import {
  requestEmailVerification,
  sendEmailVerification,
  verifyEmail,
} from '../../src/services/email-verification.service.js';

const userId = '507f1f77bcf86cd799439011';
const user = {
  id: userId,
  name: 'Amina Rahman',
  email: 'amina@example.com',
  isEmailVerified: false,
};

describe('email verification service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findTokenAndUpdateMock.mockResolvedValue({ id: 'verification-id' });
    deleteTokenMock.mockResolvedValue({ deletedCount: 1 });
    sendMessageMock.mockResolvedValue(undefined);
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
  });

  it('stores a hash and sends the raw token to the account email', async () => {
    await expect(sendEmailVerification(user)).resolves.toBe('sent');

    const storedUpdate = findTokenAndUpdateMock.mock.calls[0]?.[1] as {
      $set: { tokenHash: string; expiresAt: Date };
    };
    const sentMessage = sendMessageMock.mock.calls[0]?.[0] as { token: string };

    expect(findTokenAndUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ user: new Types.ObjectId(userId) }),
      expect.any(Object),
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    expect(storedUpdate.$set.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedUpdate.$set.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(sentMessage.token).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(sentMessage.token).not.toBe(storedUpdate.$set.tokenHash);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientName: user.name,
        recipientEmail: user.email,
      }),
    );
  });

  it('does not create another token for an already verified user', async () => {
    await expect(sendEmailVerification({ ...user, isEmailVerified: true })).resolves.toBe(
      'already_verified',
    );

    expect(findTokenAndUpdateMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('maps a competing recent request to a cooldown response', async () => {
    findTokenAndUpdateMock.mockRejectedValue({ code: 11000 });

    await expect(sendEmailVerification(user)).rejects.toMatchObject({
      statusCode: 429,
      code: 'VERIFICATION_EMAIL_COOLDOWN',
    });
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('removes the new token when email delivery fails', async () => {
    const deliveryError = new Error('Delivery unavailable');
    sendMessageMock.mockRejectedValue(deliveryError);

    await expect(sendEmailVerification(user)).rejects.toBe(deliveryError);
    expect(deleteTokenMock).toHaveBeenCalledWith({
      user: new Types.ObjectId(userId),
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it('loads the authenticated account before requesting another email', async () => {
    findUserByIdMock.mockReturnValue({ select: selectUserMock });
    selectUserMock.mockResolvedValue(user);

    await expect(requestEmailVerification(userId)).resolves.toBe('sent');
    expect(findUserByIdMock).toHaveBeenCalledWith(userId);
    expect(selectUserMock).toHaveBeenCalledWith('name email isEmailVerified');
  });

  it('verifies a user and consumes the token in one transaction', async () => {
    const saveTokenMock = vi.fn().mockResolvedValue(undefined);
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const verificationToken = {
      user: new Types.ObjectId(userId),
      consumedAt: null,
      save: saveTokenMock,
    };
    const storedUser = { isEmailVerified: false, save: saveUserMock };
    findTokenMock.mockResolvedValue(verificationToken);
    findUserByIdMock.mockResolvedValue(storedUser);

    await expect(verifyEmail('a'.repeat(43))).resolves.toBe('verified');

    expect(storedUser.isEmailVerified).toBe(true);
    expect(verificationToken.consumedAt).toBeInstanceOf(Date);
    expect(saveUserMock).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(saveTokenMock).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('treats a previously consumed valid token as successful', async () => {
    findTokenMock.mockResolvedValue({
      user: new Types.ObjectId(userId),
      consumedAt: new Date(),
      save: vi.fn(),
    });

    await expect(verifyEmail('a'.repeat(43))).resolves.toBe('already_verified');
    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('rejects an invalid or expired token without updating a user', async () => {
    findTokenMock.mockResolvedValue(null);

    await expect(verifyEmail('a'.repeat(43))).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_VERIFICATION_TOKEN',
    });
    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });
});
