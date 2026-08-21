import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { EmailChangeTokenModel } from '../../src/models/email-change-token.model.js';

function createValidToken() {
  return new EmailChangeTokenModel({
    user: new Types.ObjectId(),
    pendingEmail: 'new@example.com',
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
  });
}

describe('email change token model', () => {
  it('accepts a pending change and hides its hash', async () => {
    const token = createValidToken();
    await expect(token.validate()).resolves.toBeUndefined();
    expect(token.consumedAt).toBeNull();
    expect(token.toJSON()).not.toHaveProperty('tokenHash');
  });

  it('requires a user, pending email, hash, and expiration', async () => {
    await expect(new EmailChangeTokenModel({}).validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        pendingEmail: expect.any(Object),
        tokenHash: expect.any(Object),
        expiresAt: expect.any(Object),
      },
    });
  });

  it('defines unique identities and automatic expiration', () => {
    expect(EmailChangeTokenModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ user: 1 }, expect.objectContaining({ unique: true })],
        [{ pendingEmail: 1 }, expect.objectContaining({ unique: true })],
        [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });
});
