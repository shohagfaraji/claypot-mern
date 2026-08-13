import { describe, expect, it } from 'vitest';
import {
  loginInputSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from '../../src/schemas/auth.schema.js';

const validRegistration = {
  name: '  Amina Rahman  ',
  username: '  Amina_Kitchen  ',
  email: '  AMINA@EXAMPLE.COM  ',
  password: 'Claypot9',
};

describe('registration input schema', () => {
  it('accepts and normalizes valid registration input', () => {
    const result = registerInputSchema.parse(validRegistration);

    expect(result).toEqual({
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      password: 'Claypot9',
    });
  });

  it.each([
    ['short password', 'Clay9'],
    ['missing lowercase letter', 'CLAYPOT9'],
    ['missing uppercase letter', 'claypot9'],
    ['missing number', 'Claypots'],
  ])('rejects a %s', (_case, password) => {
    const result = registerInputSchema.safeParse({
      ...validRegistration,
      password,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['password'],
        }),
      ]),
    );
  });

  it('rejects malformed account details', () => {
    const result = registerInputSchema.safeParse({
      ...validRegistration,
      name: 'A',
      username: '_invalid_user_',
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['name', 'username', 'email']),
    );
  });

  it('rejects account fields controlled by the server', () => {
    const result = registerInputSchema.safeParse({
      ...validRegistration,
      role: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
        }),
      ]),
    );
  });
});

describe('login input schema', () => {
  it.each([
    ['email address', '  AMINA@EXAMPLE.COM  ', 'amina@example.com'],
    ['username', '  Amina_Kitchen  ', 'amina_kitchen'],
  ])('accepts and normalizes a valid %s', (_case, identifier, expectedIdentifier) => {
    expect(
      loginInputSchema.parse({
        identifier,
        password: 'Claypot9',
      }),
    ).toEqual({
      identifier: expectedIdentifier,
      password: 'Claypot9',
    });
  });

  it('rejects malformed credentials and unknown fields', () => {
    const result = loginInputSchema.safeParse({
      identifier: '_invalid_',
      password: '',
      role: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['identifier', 'password']),
    );
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
        }),
      ]),
    );
  });
});

describe('profile update input schema', () => {
  it('normalizes editable profile fields', () => {
    expect(
      updateProfileInputSchema.parse({
        name: '  Amina Noor  ',
        avatarUrl: '  https://images.example.com/amina.jpg  ',
        avatarPublicId: '  claypot/avatars/user-id/avatar-id  ',
        bio: '  Home cook and recipe collector.  ',
      }),
    ).toEqual({
      name: 'Amina Noor',
      avatarUrl: 'https://images.example.com/amina.jpg',
      avatarPublicId: 'claypot/avatars/user-id/avatar-id',
      bio: 'Home cook and recipe collector.',
    });
  });

  it('allows optional profile fields to be cleared', () => {
    expect(
      updateProfileInputSchema.parse({ avatarUrl: null, avatarPublicId: null, bio: null }),
    ).toEqual({
      avatarUrl: null,
      avatarPublicId: null,
      bio: null,
    });
  });

  it('requires an avatar URL with managed avatar metadata', () => {
    const result = updateProfileInputSchema.safeParse({
      avatarUrl: null,
      avatarPublicId: 'claypot/avatars/user-id/avatar-id',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['avatarUrl'] }));
  });

  it('rejects empty updates, invalid URLs, and server-controlled fields', () => {
    expect(updateProfileInputSchema.safeParse({}).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ role: 'admin' }).success).toBe(false);
  });
});
