import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cancelEmailChange,
  confirmEmailAddressChange,
  getPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
} from '@/features/auth/api/auth';

afterEach(() => vi.unstubAllGlobals());

describe('email change API', () => {
  const pending = {
    email: 'new@example.com',
    expiresAt: '2026-08-22T08:00:00.000Z',
    canResendAt: '2026-08-21T08:01:00.000Z',
  };

  it('loads and requests pending email changes', async () => {
    const request = vi.fn().mockResolvedValue({ data: { pending } });
    const input = { email: 'new@example.com', password: 'Claypot9' };

    await expect(getPendingEmailChange(request)).resolves.toEqual(pending);
    await expect(requestEmailChange(request, input)).resolves.toEqual(pending);
    expect(request).toHaveBeenNthCalledWith(1, '/auth/email-change');
    expect(request).toHaveBeenNthCalledWith(2, '/auth/email-change/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('resends and cancels pending changes', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ data: { pending } })
      .mockResolvedValueOnce(undefined);

    await expect(resendEmailChange(request)).resolves.toEqual(pending);
    await expect(cancelEmailChange(request)).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(1, '/auth/email-change/resend', { method: 'POST' });
    expect(request).toHaveBeenNthCalledWith(2, '/auth/email-change', { method: 'DELETE' });
  });

  it('confirms a public email change token', async () => {
    const token = 'a'.repeat(43);
    const result = { status: 'changed', currentSessionPreserved: true };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(confirmEmailAddressChange(token)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/auth/email-change/confirm',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ token }) }),
    );
  });
});
