import { describe, expect, it } from 'vitest';

import { getAuthRedirectPath } from '@/features/auth/lib/get-auth-redirect-path';

describe('authentication redirect path', () => {
  it('keeps an internal protected route', () => {
    expect(getAuthRedirectPath({ from: '/my-recipes?page=2#results' })).toBe(
      '/my-recipes?page=2#results',
    );
  });

  it.each([
    undefined,
    null,
    {},
    { from: 42 },
    { from: 'https://example.com' },
    { from: '//example.com' },
    { from: '/\\example.com' },
  ])('falls back to the home page for an unsafe state', (state) => {
    expect(getAuthRedirectPath(state)).toBe('/');
  });
});
