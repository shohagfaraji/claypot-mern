import { describe, expect, it, vi } from 'vitest';

import { getAdminRecipes } from '@/features/admin/api/get-admin-recipes';
import { deleteRecipe } from '@/features/recipes/api/delete-recipe';
import { publishRecipe } from '@/features/recipes/api/publish-recipe';
import { unpublishRecipe } from '@/features/recipes/api/unpublish-recipe';

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

  it('uses the authenticated recipe lifecycle endpoints for moderation', async () => {
    const request = vi.fn().mockResolvedValue(undefined);

    await publishRecipe(request, 'recipe-id');
    await unpublishRecipe(request, 'recipe-id');
    await deleteRecipe(request, 'recipe-id');

    expect(request).toHaveBeenNthCalledWith(1, '/recipes/recipe-id/publish', {
      method: 'PATCH',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/recipes/recipe-id/unpublish', {
      method: 'PATCH',
    });
    expect(request).toHaveBeenNthCalledWith(3, '/recipes/recipe-id', {
      method: 'DELETE',
    });
  });
});
