import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createUserMock, hashPasswordMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    create: createUserMock,
  },
}));

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: hashPasswordMock,
}));

import { registerUser } from '../../src/services/auth.service.js';

const registrationInput = {
  name: 'Amina Rahman',
  username: 'amina_kitchen',
  email: 'amina@example.com',
  password: 'Claypot9',
};

describe('authentication service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
