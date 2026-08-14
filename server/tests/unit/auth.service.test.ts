import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createUserMock,
  deleteManagedImageAfterPersistenceMock,
  findUserByIdMock,
  findUserMock,
  hashPasswordMock,
  selectCurrentUserMock,
  selectPasswordMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  deleteManagedImageAfterPersistenceMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  findUserMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  selectCurrentUserMock: vi.fn(),
  selectPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock('../../src/services/media.service.js', () => ({
  deleteManagedImageAfterPersistence: deleteManagedImageAfterPersistenceMock,
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    create: createUserMock,
    findById: findUserByIdMock,
    findOne: findUserMock,
  },
}));

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

import {
  authenticateUser,
  getCurrentUser,
  registerUser,
  updateCurrentUser,
} from '../../src/services/auth.service.js';

const registrationInput = {
  name: 'Amina Rahman',
  username: 'amina_kitchen',
  email: 'amina@example.com',
  password: 'Claypot9',
};

describe('authentication service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findUserMock.mockReturnValue({
      select: selectPasswordMock,
    });
  });

  it('hashes the password and creates a user', async () => {
    const createdAt = new Date('2026-07-27T08:00:00.000Z');

    hashPasswordMock.mockResolvedValue('stored-password-hash');
    createUserMock.mockResolvedValue({
      id: 'user-id',
      name: registrationInput.name,
      username: registrationInput.username,
      email: registrationInput.email,
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt,
    });

    const user = await registerUser(registrationInput);

    expect(hashPasswordMock).toHaveBeenCalledWith(registrationInput.password);
    expect(createUserMock).toHaveBeenCalledWith({
      name: registrationInput.name,
      username: registrationInput.username,
      email: registrationInput.email,
      passwordHash: 'stored-password-hash',
    });
    expect(user).toEqual({
      id: 'user-id',
      name: registrationInput.name,
      username: registrationInput.username,
      email: registrationInput.email,
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt,
    });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('returns a conflict for a duplicate email or username', async () => {
    hashPasswordMock.mockResolvedValue('stored-password-hash');
    createUserMock.mockRejectedValue({ code: 11000 });

    await expect(registerUser(registrationInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'ACCOUNT_ALREADY_EXISTS',
      message: 'An account with that email or username already exists.',
    });
  });

  it('preserves unexpected persistence errors', async () => {
    const databaseError = new Error('Database unavailable');

    hashPasswordMock.mockResolvedValue('stored-password-hash');
    createUserMock.mockRejectedValue(databaseError);

    await expect(registerUser(registrationInput)).rejects.toBe(databaseError);
  });
});

describe('login authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findUserMock.mockReturnValue({
      select: selectPasswordMock,
    });
  });

  it('authenticates a user and records the login time', async () => {
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const user = {
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      passwordHash: 'stored-password-hash',
      avatarUrl: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      lastLoginAt: null,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      save: saveUserMock,
    };

    selectPasswordMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(true);

    const result = await authenticateUser({
      identifier: 'amina@example.com',
      password: 'Claypot9',
    });

    expect(findUserMock).toHaveBeenCalledWith({
      $or: [{ email: 'amina@example.com' }, { username: 'amina@example.com' }],
    });
    expect(selectPasswordMock).toHaveBeenCalledWith('+passwordHash');
    expect(verifyPasswordMock).toHaveBeenCalledWith('Claypot9', 'stored-password-hash');
    expect(user.lastLoginAt).toBeInstanceOf(Date);
    expect(saveUserMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns the same error for an incorrect password', async () => {
    const saveUserMock = vi.fn();

    selectPasswordMock.mockResolvedValue({
      passwordHash: 'stored-password-hash',
      save: saveUserMock,
    });
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      authenticateUser({
        identifier: 'amina_kitchen',
        password: 'Incorrect9',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(saveUserMock).not.toHaveBeenCalled();
  });

  it('performs password verification for an unknown account', async () => {
    selectPasswordMock.mockResolvedValue(null);
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      authenticateUser({
        identifier: 'unknown@example.com',
        password: 'Claypot9',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(verifyPasswordMock).toHaveBeenCalledWith(
      'Claypot9',
      expect.stringMatching(/^\$2b\$12\$/),
    );
  });
});

describe('current user lookup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findUserByIdMock.mockReturnValue({
      select: selectCurrentUserMock,
    });
  });

  it('returns the public profile for an existing user', async () => {
    const createdAt = new Date('2026-07-27T08:00:00.000Z');

    selectCurrentUserMock.mockResolvedValue({
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt,
    });

    await expect(getCurrentUser('user-id')).resolves.toEqual({
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt,
    });
    expect(findUserByIdMock).toHaveBeenCalledWith('user-id');
    expect(selectCurrentUserMock).toHaveBeenCalledWith(
      'name username email avatarUrl avatarPublicId bio role isEmailVerified createdAt',
    );
  });

  it('rejects a token identity whose user no longer exists', async () => {
    selectCurrentUserMock.mockResolvedValue(null);

    await expect(getCurrentUser('missing-user-id')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

describe('current user profile update', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates editable fields and returns the public user', async () => {
    const saveUserMock = vi.fn().mockResolvedValue(undefined);
    const user = {
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      bio: null,
      role: 'user' as const,
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      save: saveUserMock,
    };
    findUserByIdMock.mockResolvedValue(user);

    const result = await updateCurrentUser('user-id', {
      name: 'Amina Noor',
      avatarUrl: 'https://images.example.com/amina.jpg',
      avatarPublicId: 'claypot/avatars/user-id/avatar-id',
      bio: 'Home cook and recipe collector.',
    });

    expect(findUserByIdMock).toHaveBeenCalledWith('user-id');
    expect(saveUserMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      id: 'user-id',
      name: 'Amina Noor',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: 'https://images.example.com/amina.jpg',
      avatarPublicId: 'claypot/avatars/user-id/avatar-id',
      bio: 'Home cook and recipe collector.',
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
    });
  });

  it('clears optional fields without changing account identity', async () => {
    const user = {
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: 'https://images.example.com/amina.jpg',
      avatarPublicId: 'claypot/avatars/user-id/avatar-id',
      bio: 'Home cook.',
      role: 'user' as const,
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      save: vi.fn().mockResolvedValue(undefined),
    };
    findUserByIdMock.mockResolvedValue(user);

    await updateCurrentUser('user-id', { avatarUrl: null, avatarPublicId: null, bio: null });

    expect(user.avatarUrl).toBeNull();
    expect(user.avatarPublicId).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.username).toBe('amina_kitchen');
    expect(user.email).toBe('amina@example.com');
    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledWith(
      'claypot/avatars/user-id/avatar-id',
    );
    expect(user.save.mock.invocationCallOrder[0]).toBeLessThan(
      deleteManagedImageAfterPersistenceMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('rejects managed avatars outside the current user folder', async () => {
    const user = {
      id: 'user-id',
      avatarUrl: null,
      avatarPublicId: null,
      save: vi.fn(),
    };
    findUserByIdMock.mockResolvedValue(user);

    await expect(
      updateCurrentUser('user-id', {
        avatarUrl: 'https://res.cloudinary.com/claypot/image/upload/avatar.jpg',
        avatarPublicId: 'claypot/avatars/another-user/avatar-id',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_AVATAR_ASSET', statusCode: 400 });
    expect(user.save).not.toHaveBeenCalled();
  });

  it('rejects an identity whose user no longer exists', async () => {
    findUserByIdMock.mockResolvedValue(null);

    await expect(
      updateCurrentUser('missing-user-id', { name: 'Amina Noor' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});
