import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPasswordReset, resendPasswordReset, resetPassword } from '@/features/auth/api/auth';

afterEach(() => vi.unstubAllGlobals());

describe('password recovery API', () => {
  it.each([
    [requestPasswordReset, '/auth/password-recovery/request'],
    [resendPasswordReset, '/auth/password-recovery/resend'],
  ] as const)('submits an email to %s', async (submit, path) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { message: 'Request accepted.' } }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(submit({ email: 'amina@example.com' })).resolves.toBe('Request accepted.');
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:5000/api/v1${path}`,
      expect.objectContaining({ body: JSON.stringify({ email: 'amina@example.com' }) }),
    );
  });

  it('submits a new password and token', async () => {
    const input = { token: 'a'.repeat(43), password: 'NewClaypot9' };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { message: 'Password reset.' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(resetPassword(input)).resolves.toBe('Password reset.');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/auth/password-recovery/reset',
      expect.objectContaining({ body: JSON.stringify(input) }),
    );
  });
});
