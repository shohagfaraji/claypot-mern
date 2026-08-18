import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAuthenticatedCurrentUser,
  resendVerificationEmail,
  verifyEmailAddress,
} from '@/features/auth/api/auth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('email verification API', () => {
  it('submits a verification token to the public endpoint', async () => {
    const token = 'a'.repeat(43);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'verified' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyEmailAddress(token)).resolves.toBe('verified');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/auth/email-verification/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    );
  });

  it('requests another verification email through the authenticated client', async () => {
    const request = vi.fn().mockResolvedValue({ data: { status: 'sent' } });

    await expect(resendVerificationEmail(request)).resolves.toBe('sent');
    expect(request).toHaveBeenCalledWith('/auth/email-verification/resend', { method: 'POST' });
  });

  it('refreshes the current account through the authenticated client', async () => {
    const user = { id: 'user-id', email: 'amina@example.com', isEmailVerified: true };
    const request = vi.fn().mockResolvedValue({ data: { user } });

    await expect(getAuthenticatedCurrentUser(request)).resolves.toEqual(user);
    expect(request).toHaveBeenCalledWith('/auth/me');
  });
});
