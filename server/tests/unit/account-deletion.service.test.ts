import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  countAdminsMock,
  deleteEmailChangeTokensMock,
  deleteEmailVerificationTokensMock,
  deleteManagedImageAfterPersistenceMock,
  deletePasswordResetTokensMock,
  deleteRecipesMock,
  deleteRefreshSessionsMock,
  deleteReviewsMock,
  deleteSavedRecipesMock,
  deleteUserMock,
  endSessionMock,
  findRecipesMock,
  findRefreshSessionMock,
  findUserMock,
  hashRefreshTokenMock,
  selectPasswordMock,
  startSessionMock,
  verifyPasswordMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  countAdminsMock: vi.fn(),
  deleteEmailChangeTokensMock: vi.fn(),
  deleteEmailVerificationTokensMock: vi.fn(),
  deleteManagedImageAfterPersistenceMock: vi.fn(),
  deletePasswordResetTokensMock: vi.fn(),
  deleteRecipesMock: vi.fn(),
  deleteRefreshSessionsMock: vi.fn(),
  deleteReviewsMock: vi.fn(),
  deleteSavedRecipesMock: vi.fn(),
  deleteUserMock: vi.fn(),
  endSessionMock: vi.fn(),
  findRecipesMock: vi.fn(),
  findRefreshSessionMock: vi.fn(),
  findUserMock: vi.fn(),
  hashRefreshTokenMock: vi.fn(),
  selectPasswordMock: vi.fn(),
  startSessionMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));
vi.mock('../../src/lib/password.js', () => ({ verifyPassword: verifyPasswordMock }));
vi.mock('../../src/lib/refresh-token.js', () => ({ hashRefreshToken: hashRefreshTokenMock }));
vi.mock('../../src/services/media.service.js', () => ({
  deleteManagedImageAfterPersistence: deleteManagedImageAfterPersistenceMock,
}));
vi.mock('../../src/models/email-change-token.model.js', () => ({
  EmailChangeTokenModel: { deleteMany: deleteEmailChangeTokensMock },
}));
vi.mock('../../src/models/email-verification-token.model.js', () => ({
  EmailVerificationTokenModel: { deleteMany: deleteEmailVerificationTokensMock },
}));
vi.mock('../../src/models/password-reset-token.model.js', () => ({
  PasswordResetTokenModel: { deleteMany: deletePasswordResetTokensMock },
}));
vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { find: findRecipesMock, deleteMany: deleteRecipesMock },
}));
vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    findOne: findRefreshSessionMock,
    deleteMany: deleteRefreshSessionsMock,
  },
}));
vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: { deleteMany: deleteReviewsMock },
}));
vi.mock('../../src/models/saved-recipe.model.js', () => ({
  SavedRecipeModel: { deleteMany: deleteSavedRecipesMock },
}));
vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    findById: findUserMock,
    countDocuments: countAdminsMock,
    deleteOne: deleteUserMock,
  },
}));

import { deleteAccount } from '../../src/services/account-deletion.service.js';

const userId = '507f1f77bcf86cd799439011';
const recipeId = new Types.ObjectId('507f1f77bcf86cd799439012');
const transactionSession = { id: 'transaction-session' };
const user = {
  username: 'amina_kitchen',
  passwordHash: 'stored-password-hash',
  avatarPublicId: `claypot/avatars/${userId}/avatar-id`,
  role: 'user',
};

describe('account deletion service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T08:00:00.000Z'));
    vi.resetAllMocks();
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
      ...transactionSession,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
    hashRefreshTokenMock.mockReturnValue('a'.repeat(64));
    findRefreshSessionMock.mockResolvedValue({ id: 'current-session' });
    findUserMock.mockReturnValue({ select: selectPasswordMock });
    selectPasswordMock.mockResolvedValue({ ...user });
    verifyPasswordMock.mockResolvedValue(true);
    findRecipesMock.mockResolvedValue([
      {
        _id: recipeId,
        imagePublicId: `claypot/recipes/${userId}/cover-id`,
      },
    ]);
  });

  afterEach(() => vi.useRealTimers());

  it('deletes account data transactionally and cleans managed images afterward', async () => {
    await deleteAccount(userId, 'current-refresh-token', {
      password: 'Claypot9',
      confirmation: 'amina_kitchen',
    });

    const ownerId = new Types.ObjectId(userId);
    const sessionOptions = { session: expect.objectContaining(transactionSession) };
    expect(findRefreshSessionMock).toHaveBeenCalledWith(
      {
        user: ownerId,
        tokenHash: 'a'.repeat(64),
        revokedAt: null,
        expiresAt: { $gt: new Date('2026-08-21T08:00:00.000Z') },
      },
      null,
      sessionOptions,
    );
    expect(verifyPasswordMock).toHaveBeenCalledWith('Claypot9', 'stored-password-hash');
    expect(deleteReviewsMock).toHaveBeenCalledWith(
      { $or: [{ user: ownerId }, { recipe: { $in: [recipeId] } }] },
      sessionOptions,
    );
    expect(deleteSavedRecipesMock).toHaveBeenCalledWith(
      { $or: [{ user: ownerId }, { recipe: { $in: [recipeId] } }] },
      sessionOptions,
    );
    expect(deleteRecipesMock).toHaveBeenCalledWith({ author: ownerId }, sessionOptions);
    expect(deleteEmailVerificationTokensMock).toHaveBeenCalledWith(
      { user: ownerId },
      sessionOptions,
    );
    expect(deletePasswordResetTokensMock).toHaveBeenCalledWith({ user: ownerId }, sessionOptions);
    expect(deleteEmailChangeTokensMock).toHaveBeenCalledWith({ user: ownerId }, sessionOptions);
    expect(deleteRefreshSessionsMock).toHaveBeenCalledWith({ user: ownerId }, sessionOptions);
    expect(deleteUserMock).toHaveBeenCalledWith({ _id: ownerId }, sessionOptions);
    expect(withTransactionMock).toHaveBeenCalledOnce();
    expect(endSessionMock).toHaveBeenCalledOnce();
    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledTimes(2);
    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledWith(user.avatarPublicId);
    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledWith(
      `claypot/recipes/${userId}/cover-id`,
    );
    expect(endSessionMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteManagedImageAfterPersistenceMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('rejects an invalid current session before checking credentials', async () => {
    findRefreshSessionMock.mockResolvedValue(null);

    await expect(
      deleteAccount(userId, 'invalid-refresh-token', {
        password: 'Claypot9',
        confirmation: 'amina_kitchen',
      }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_SESSION' });
    expect(findUserMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('rejects an incorrect password or username confirmation', async () => {
    verifyPasswordMock.mockResolvedValueOnce(false);

    await expect(
      deleteAccount(userId, 'current-refresh-token', {
        password: 'Incorrect9',
        confirmation: 'amina_kitchen',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CURRENT_PASSWORD' });

    verifyPasswordMock.mockResolvedValueOnce(true);
    await expect(
      deleteAccount(userId, 'current-refresh-token', {
        password: 'Claypot9',
        confirmation: 'wrong_username',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'ACCOUNT_DELETION_CONFIRMATION_MISMATCH',
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(deleteManagedImageAfterPersistenceMock).not.toHaveBeenCalled();
  });

  it('prevents deletion of the final administrator account', async () => {
    selectPasswordMock.mockResolvedValue({ ...user, role: 'admin' });
    countAdminsMock.mockResolvedValue(1);

    await expect(
      deleteAccount(userId, 'current-refresh-token', {
        password: 'Claypot9',
        confirmation: 'amina_kitchen',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'LAST_ADMIN_REQUIRED' });
    expect(countAdminsMock).toHaveBeenCalledWith(
      { role: 'admin' },
      { session: expect.objectContaining(transactionSession) },
    );
    expect(findRecipesMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });
});
