import { describe, expect, it, vi } from 'vitest';

import { getAdminRecipes } from '@/features/admin/api/get-admin-recipes';

describe('admin recipes API', () => {
  it('requests the authenticated moderation catalogue with its query', async () => {
    const data = {
      recipes: [{ id: 'recipe-id', title: 'Spiced Claypot Rice', status: 'draft' }],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    };
    const request = vi.fn().mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getAdminRecipes(request, 'page=2&limit=10&status=draft', controller.signal),
    ).resolves.toEqual(data);
    expect(request).toHaveBeenCalledWith('/admin/recipes?page=2&limit=10&status=draft', {
      signal: controller.signal,
    });
  });
});
