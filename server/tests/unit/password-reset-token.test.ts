import { describe, expect, it } from 'vitest';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from '../../src/lib/password-reset-token.js';

describe('password reset tokens', () => {
  it('creates distinct URL-safe tokens', () => {
    const firstToken = createPasswordResetToken();
    const secondToken = createPasswordResetToken();

    expect(firstToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).not.toBe(firstToken);
  });

  it('creates deterministic SHA-256 hashes without preserving the raw token', () => {
    const token = 'a'.repeat(43);
    const hash = hashPasswordResetToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashPasswordResetToken(token));
    expect(hash).not.toContain(token);
  });
});
