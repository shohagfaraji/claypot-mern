import { describe, expect, it, vi } from 'vitest';

import { deleteAccount } from '@/features/auth/api/auth';

describe('account deletion API', () => {
  it('submits current credentials to delete the authenticated account', async () => {
    const input = { password: 'Claypot9', confirmation: 'amina_kitchen' };
    const request = vi.fn().mockResolvedValue({
      data: { message: 'Your account and associated data have been deleted.' },
    });

    await expect(deleteAccount(request, input)).resolves.toBe(
      'Your account and associated data have been deleted.',
    );
    expect(request).toHaveBeenCalledWith('/auth/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });
});
