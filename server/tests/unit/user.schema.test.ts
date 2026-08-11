import { describe, expect, it } from 'vitest';
import { usernameParamsSchema } from '../../src/schemas/user.schema.js';

describe('public profile username parameters', () => {
  it('normalizes a valid username', () => {
    expect(usernameParamsSchema.parse({ username: '  Amina_Kitchen  ' })).toEqual({
      username: 'amina_kitchen',
    });
  });

  it.each(['ab', '_invalid_', 'invalid-name', 'a'.repeat(31)])(
    'rejects the invalid username %s',
    (username) => {
      expect(usernameParamsSchema.safeParse({ username }).success).toBe(false);
    },
  );
});
