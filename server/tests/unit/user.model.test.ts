import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/user.model.js';

function createValidUser() {
  return new UserModel({
    name: '  Amina Rahman  ',
    username: '  Amina_Kitchen  ',
    email: '  AMINA@EXAMPLE.COM  ',
    passwordHash: 'hashed-password',
  });
}

describe('User model', () => {
  it('accepts and normalizes valid account details', async () => {
    const user = createValidUser();

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.name).toBe('Amina Rahman');
    expect(user.username).toBe('amina_kitchen');
    expect(user.email).toBe('amina@example.com');
    expect(user.role).toBe('user');
    expect(user.isEmailVerified).toBe(false);
    expect(user.avatarUrl).toBeNull();
    expect(user.avatarPublicId).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.lastLoginAt).toBeNull();
  });

  it('does not include private fields in JSON output', () => {
    const user = createValidUser();
    user.avatarPublicId = 'claypot/avatars/user-id/avatar-id';
    const output = user.toJSON();

    expect(output).not.toHaveProperty('passwordHash');
    expect(output).not.toHaveProperty('avatarPublicId');
  });

  it('requires identity and authentication fields', async () => {
    const user = new UserModel({});

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        name: expect.any(Object),
        username: expect.any(Object),
        email: expect.any(Object),
        passwordHash: expect.any(Object),
      },
    });
  });

  it('rejects malformed profile details and unsupported roles', async () => {
    const user = createValidUser();

    user.username = '_invalid_user_';
    user.email = 'invalid-email';
    user.bio = 'a'.repeat(301);
    user.set('role', 'editor');

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        username: expect.any(Object),
        email: expect.any(Object),
        bio: expect.any(Object),
        role: expect.any(Object),
      },
    });
  });
});
