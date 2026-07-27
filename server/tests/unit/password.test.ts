import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('password utilities', () => {
  it('creates a bcrypt hash using the configured work factor', async () => {
    const password = 'Claypot!Recipe9';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(bcrypt.getRounds(passwordHash)).toBe(12);
  });

  it('accepts the matching password', async () => {
    const password = 'Claypot!Recipe9';
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const passwordHash = await hashPassword('Claypot!Recipe9');

    await expect(verifyPassword('Different!Recipe9', passwordHash)).resolves.toBe(false);
  });
});
