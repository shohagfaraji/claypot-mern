import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { PasswordResetTokenModel } from '../../src/models/password-reset-token.model.js';

function createValidToken() {
  return new PasswordResetTokenModel({
    user: new Types.ObjectId(),
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
  });
}

describe('password reset token model', () => {
  it('accepts a valid token and hides its hash', async () => {
    const token = createValidToken();
    await expect(token.validate()).resolves.toBeUndefined();
    expect(token.consumedAt).toBeNull();
    expect(token.toJSON()).not.toHaveProperty('tokenHash');
  });

  it('requires its user, hash, and expiration', async () => {
    await expect(new PasswordResetTokenModel({}).validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        tokenHash: expect.any(Object),
        expiresAt: expect.any(Object),
      },
    });
  });

  it('defines unique identities and automatic expiration', () => {
    expect(PasswordResetTokenModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ user: 1 }, expect.objectContaining({ unique: true })],
        [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });
});
