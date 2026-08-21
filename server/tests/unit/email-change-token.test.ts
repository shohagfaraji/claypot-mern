import { describe, expect, it } from 'vitest';
import { createEmailChangeToken, hashEmailChangeToken } from '../../src/lib/email-change-token.js';

describe('email change tokens', () => {
  it('creates distinct URL-safe tokens', () => {
    const firstToken = createEmailChangeToken();
    const secondToken = createEmailChangeToken();

    expect(firstToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).toMatch(/^[a-zA-Z0-9_-]{43}$/);
    expect(secondToken).not.toBe(firstToken);
  });

  it('creates deterministic SHA-256 hashes without preserving the raw token', () => {
    const token = 'a'.repeat(43);
    const hash = hashEmailChangeToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashEmailChangeToken(token));
    expect(hash).not.toContain(token);
  });
});
