import { describe, expect, it, vi } from 'vitest';

import { getAdminUsers } from '@/features/admin/api/get-admin-users';
import { updateAdminUserRole } from '@/features/admin/api/update-admin-user-role';

describe('admin users API', () => {
  it('requests the authenticated user directory with its query', async () => {
    const data = {
      users: [{ id: 'user-id', name: 'Amina Rahman', role: 'user' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    const request = vi.fn().mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getAdminUsers(request, 'page=1&limit=10&role=user', controller.signal),
    ).resolves.toEqual(data);
    expect(request).toHaveBeenCalledWith('/admin/users?page=1&limit=10&role=user', {
      signal: controller.signal,
    });
  });

  it('updates a member role', async () => {
    const user = { id: '507f1f77bcf86cd799439011', role: 'admin' as const };
    const request = vi.fn().mockResolvedValue({ data: { user } });

    await expect(updateAdminUserRole(request, user.id, 'admin')).resolves.toEqual(user);
    expect(request).toHaveBeenCalledWith(`/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
  });
});
