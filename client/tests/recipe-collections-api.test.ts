import { describe, expect, it, vi } from 'vitest';

import {
  addRecipeToCollection,
  createRecipeCollection,
  deleteRecipeCollection,
  getCollectionRecipes,
  getRecipeCollectionMemberships,
  getRecipeCollections,
  removeRecipeFromCollection,
  updateRecipeCollection,
} from '@/features/collections/api/collections';

describe('recipe collections API', () => {
  it('lists, creates, updates, and deletes collections', async () => {
    const collection = { id: 'collection-id', name: 'Weeknight dinners' };
    const request = vi
      .fn()
      .mockResolvedValueOnce({ data: { collections: [collection] } })
      .mockResolvedValueOnce({ data: { collection } })
      .mockResolvedValueOnce({ data: { collection: { ...collection, name: 'Quick meals' } } })
      .mockResolvedValueOnce(undefined);
    const controller = new AbortController();

    await expect(getRecipeCollections(request, controller.signal)).resolves.toEqual([collection]);
    await expect(
      createRecipeCollection(request, { name: 'Weeknight dinners', description: null }),
    ).resolves.toEqual(collection);
    await expect(
      updateRecipeCollection(request, 'collection-id', {
        name: 'Quick meals',
        description: 'Ready without a long wait.',
      }),
    ).resolves.toMatchObject({ name: 'Quick meals' });
    await expect(deleteRecipeCollection(request, 'collection-id')).resolves.toBeUndefined();

    expect(request).toHaveBeenNthCalledWith(1, '/collections', { signal: controller.signal });
    expect(request).toHaveBeenNthCalledWith(2, '/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Weeknight dinners', description: null }),
    });
    expect(request).toHaveBeenNthCalledWith(3, '/collections/collection-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Quick meals',
        description: 'Ready without a long wait.',
      }),
    });
    expect(request).toHaveBeenNthCalledWith(4, '/collections/collection-id', {
      method: 'DELETE',
    });
  });

  it('loads a filtered collection recipe page and memberships', async () => {
    const data = {
      collection: { id: 'collection-id', name: 'Weeknight dinners' },
      recipes: [{ id: 'recipe-id' }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
    };
    const memberships = [{ id: 'collection-id', containsRecipe: true }];
    const request = vi
      .fn()
      .mockResolvedValueOnce({ data })
      .mockResolvedValueOnce({ data: { collections: memberships } });
    const controller = new AbortController();

    await expect(
      getCollectionRecipes(
        request,
        'collection-id',
        'page=1&limit=9&sort=saved',
        controller.signal,
      ),
    ).resolves.toEqual(data);
    await expect(
      getRecipeCollectionMemberships(request, 'recipe-id', controller.signal),
    ).resolves.toEqual(memberships);

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/collections/collection-id/recipes?page=1&limit=9&sort=saved',
      { signal: controller.signal },
    );
    expect(request).toHaveBeenNthCalledWith(2, '/collections/memberships/recipe-id', {
      signal: controller.signal,
    });
  });

  it('adds and removes a recipe membership idempotently', async () => {
    const request = vi.fn().mockResolvedValue(undefined);

    await expect(
      addRecipeToCollection(request, 'collection-id', 'recipe-id'),
    ).resolves.toBeUndefined();
    await expect(
      removeRecipeFromCollection(request, 'collection-id', 'recipe-id'),
    ).resolves.toBeUndefined();

    expect(request).toHaveBeenNthCalledWith(1, '/collections/collection-id/recipes/recipe-id', {
      method: 'PUT',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/collections/collection-id/recipes/recipe-id', {
      method: 'DELETE',
    });
  });
});
