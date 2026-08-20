import { describe, expect, it, vi } from 'vitest';
import {
  changeAccountPassword,
  getAccountSessions,
  revokeAccountSession,
  revokeOtherAccountSessions,
} from '@/features/auth/api/auth';

describe('account security API', () => {
  it('loads active account sessions', async () => {
    const sessions = [{ id: 'session-id', device: 'Chrome on Linux', isCurrent: true }];
    const request = vi.fn().mockResolvedValue({ data: { sessions } });

    await expect(getAccountSessions(request)).resolves.toEqual(sessions);
    expect(request).toHaveBeenCalledWith('/auth/sessions');
  });

  it('revokes one session or all other sessions', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        data: { revokedCount: 2 },
      });

    await expect(revokeAccountSession(request, 'session-id')).resolves.toBeUndefined();
    await expect(revokeOtherAccountSessions(request)).resolves.toBe(2);
    expect(request).toHaveBeenNthCalledWith(1, '/auth/sessions/session-id', {
      method: 'DELETE',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/auth/sessions', { method: 'DELETE' });
  });

  it('submits current and replacement passwords', async () => {
    const input = { currentPassword: 'Claypot9', newPassword: 'NewClaypot9' };
    const request = vi.fn().mockResolvedValue({ data: { message: 'Password updated.' } });

    await expect(changeAccountPassword(request, input)).resolves.toBe('Password updated.');
    expect(request).toHaveBeenCalledWith('/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });
});
