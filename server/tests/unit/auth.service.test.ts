import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createUserMock,
  findUserByIdMock,
  findUserMock,
  hashPasswordMock,
  selectCurrentUserMock,
  selectPasswordMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  findUserMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  selectCurrentUserMock: vi.fn(),
  selectPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
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

import { authenticateUser, getCurrentUser, registerUser } from '../../src/services/auth.service.js';

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
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt,
    });
    expect(findUserByIdMock).toHaveBeenCalledWith('user-id');
    expect(selectCurrentUserMock).toHaveBeenCalledWith(
      'name username email avatarUrl bio role isEmailVerified createdAt',
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
