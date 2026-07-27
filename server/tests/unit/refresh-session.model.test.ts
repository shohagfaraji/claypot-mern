import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { RefreshSessionModel } from '../../src/models/refresh-session.model.js';

function createValidSession() {
  return new RefreshSessionModel({
    user: new Types.ObjectId(),
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
    userAgent: '  Mozilla/5.0  ',
    ipAddress: '  127.0.0.1  ',
  });
}

describe('Refresh session model', () => {
  it('accepts session metadata and applies defaults', async () => {
    const session = createValidSession();

    await expect(session.validate()).resolves.toBeUndefined();
    expect(session.userAgent).toBe('Mozilla/5.0');
    expect(session.ipAddress).toBe('127.0.0.1');
    expect(session.revokedAt).toBeNull();
    expect(session.lastUsedAt).toBeNull();
  });

  it('does not include the token hash in JSON output', () => {
    const session = createValidSession();

    expect(session.toJSON()).not.toHaveProperty('tokenHash');
  });

  it('requires the session identity, token hash, and expiration', async () => {
    const session = new RefreshSessionModel({});

    await expect(session.validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        tokenHash: expect.any(Object),
        expiresAt: expect.any(Object),
      },
    });
  });

  it('rejects malformed hashes and oversized metadata', async () => {
    const session = createValidSession();

    session.tokenHash = 'not-a-sha256-hash';
    session.userAgent = 'a'.repeat(501);
    session.ipAddress = 'a'.repeat(46);

    await expect(session.validate()).rejects.toMatchObject({
      errors: {
        tokenHash: expect.any(Object),
        userAgent: expect.any(Object),
        ipAddress: expect.any(Object),
      },
    });
  });

  it('defines indexes for expiration, token lookup, and active user sessions', () => {
    expect(RefreshSessionModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        [{ user: 1, revokedAt: 1 }, expect.any(Object)],
      ]),
    );
  });
});
