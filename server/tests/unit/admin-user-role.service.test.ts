import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  countAdminsMock,
  endSessionMock,
  findUserMock,
  revokeSessionsMock,
  startSessionMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  countAdminsMock: vi.fn(),
  endSessionMock: vi.fn(),
  findUserMock: vi.fn(),
  revokeSessionsMock: vi.fn(),
  startSessionMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {},
}));

vi.mock('../../src/models/refresh-session.model.js', () => ({
  RefreshSessionModel: {
    updateMany: revokeSessionsMock,
  },
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {},
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    countDocuments: countAdminsMock,
    findOne: findUserMock,
  },
}));

import { updateAdminUserRole } from '../../src/services/admin.service.js';

const actorId = '507f1f77bcf86cd799439011';
const targetId = '507f1f77bcf86cd799439012';

describe('admin user role service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
    revokeSessionsMock.mockResolvedValue({ modifiedCount: 1 });
  });

  it('promotes a user and revokes their active sessions in one transaction', async () => {
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const user = { id: targetId, role: 'user' as const, save: saveUserMock };
    findUserMock.mockResolvedValue(user);

    await expect(updateAdminUserRole(actorId, targetId, { role: 'admin' })).resolves.toEqual({
      id: targetId,
      role: 'admin',
    });

    const session = expect.any(Object);
    const target = new Types.ObjectId(targetId);
    expect(findUserMock).toHaveBeenCalledWith({ _id: target }, null, { session });
    expect(saveUserMock).toHaveBeenCalledWith({ session });
    expect(revokeSessionsMock).toHaveBeenCalledWith(
      { user: target, revokedAt: null },
      { $set: { revokedAt: expect.any(Date) } },
      { session },
    );
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('demotes an administrator when another administrator remains', async () => {
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const user = { id: targetId, role: 'admin' as const, save: saveUserMock };
    findUserMock.mockResolvedValue(user);
    countAdminsMock.mockResolvedValue(2);

    await expect(updateAdminUserRole(actorId, targetId, { role: 'user' })).resolves.toEqual({
      id: targetId,
      role: 'user',
    });

    expect(countAdminsMock).toHaveBeenCalledWith(
      { role: 'admin' },
      { session: expect.any(Object) },
    );
    expect(saveUserMock).toHaveBeenCalledOnce();
    expect(revokeSessionsMock).toHaveBeenCalledOnce();
  });

  it('prevents an administrator from changing their own role', async () => {
    await expect(updateAdminUserRole(actorId, actorId, { role: 'user' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'ADMIN_SELF_ROLE_CHANGE',
    });

    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('prevents removal of the final administrator', async () => {
    const saveUserMock = vi.fn();
    findUserMock.mockResolvedValue({ id: targetId, role: 'admin', save: saveUserMock });
    countAdminsMock.mockResolvedValue(1);

    await expect(updateAdminUserRole(actorId, targetId, { role: 'user' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'LAST_ADMIN_REQUIRED',
    });

    expect(saveUserMock).not.toHaveBeenCalled();
    expect(revokeSessionsMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('returns not found without changing sessions for a missing user', async () => {
    findUserMock.mockResolvedValue(null);

    await expect(updateAdminUserRole(actorId, targetId, { role: 'admin' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });

    expect(revokeSessionsMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('treats an existing role as an idempotent update', async () => {
    const saveUserMock = vi.fn();
    findUserMock.mockResolvedValue({ id: targetId, role: 'user', save: saveUserMock });

    await expect(updateAdminUserRole(actorId, targetId, { role: 'user' })).resolves.toEqual({
      id: targetId,
      role: 'user',
    });

    expect(saveUserMock).not.toHaveBeenCalled();
    expect(revokeSessionsMock).not.toHaveBeenCalled();
  });
});
