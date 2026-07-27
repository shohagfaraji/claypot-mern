import { describe, expect, it } from 'vitest';
import { createAccessToken, verifyAccessToken } from '../../src/lib/access-token.js';

describe('access token utilities', () => {
  it('creates and verifies an access token identity', async () => {
    const identity = {
      userId: '507f1f77bcf86cd799439011',
      role: 'user' as const,
    };

    const token = await createAccessToken(identity);

    expect(token.split('.')).toHaveLength(3);
    await expect(verifyAccessToken(token)).resolves.toEqual(identity);
  });

  it('preserves administrative roles', async () => {
    const identity = {
      userId: '507f1f77bcf86cd799439012',
      role: 'admin' as const,
    };

    const token = await createAccessToken(identity);

    await expect(verifyAccessToken(token)).resolves.toEqual(identity);
  });

  it('rejects a token with a modified signature', async () => {
    const token = await createAccessToken({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    const signatureStart = token.lastIndexOf('.') + 1;
    const currentCharacter = token[signatureStart];
    const replacementCharacter = currentCharacter === 'a' ? 'b' : 'a';
    const tamperedToken =
      token.slice(0, signatureStart) + replacementCharacter + token.slice(signatureStart + 1);

    await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
  });
});
