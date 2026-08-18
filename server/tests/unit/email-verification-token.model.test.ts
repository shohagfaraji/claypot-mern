import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { EmailVerificationTokenModel } from '../../src/models/email-verification-token.model.js';

function createValidToken() {
  return new EmailVerificationTokenModel({
    user: new Types.ObjectId(),
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
  });
}

describe('email verification token model', () => {
  it('accepts a valid token and applies its default state', async () => {
    const token = createValidToken();

    await expect(token.validate()).resolves.toBeUndefined();
    expect(token.consumedAt).toBeNull();
  });

  it('does not expose the token hash in JSON output', () => {
    expect(createValidToken().toJSON()).not.toHaveProperty('tokenHash');
  });

  it('requires its user, hash, and expiration', async () => {
    await expect(new EmailVerificationTokenModel({}).validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        tokenHash: expect.any(Object),
        expiresAt: expect.any(Object),
      },
    });
  });

  it('rejects malformed token hashes', async () => {
    const token = createValidToken();
    token.tokenHash = 'invalid-hash';

    await expect(token.validate()).rejects.toMatchObject({
      errors: {
        tokenHash: expect.any(Object),
      },
    });
  });

  it('defines unique user and hash indexes plus automatic expiration', () => {
    expect(EmailVerificationTokenModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ user: 1 }, expect.objectContaining({ unique: true })],
        [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });
});
