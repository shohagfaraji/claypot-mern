import { describe, expect, it } from 'vitest';
import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
} from '../../src/lib/email-verification-token.js';

describe('email verification tokens', () => {
  it('creates URL-safe random tokens', () => {
    const firstToken = createEmailVerificationToken();
    const secondToken = createEmailVerificationToken();

    expect(firstToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).not.toBe(firstToken);
  });

  it('creates deterministic SHA-256 hashes without preserving the raw token', () => {
    const token = 'a'.repeat(43);
    const hash = hashEmailVerificationToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashEmailVerificationToken(token));
    expect(hash).not.toContain(token);
  });
});
