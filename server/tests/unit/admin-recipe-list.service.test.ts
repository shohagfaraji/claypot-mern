import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateRecipesMock } = vi.hoisted(() => ({
  aggregateRecipesMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    aggregate: aggregateRecipesMock,
  },
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {},
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {},
}));

import { listAdminRecipes } from '../../src/services/admin.service.js';

describe('admin recipe listing service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a filtered and paginated moderation list', async () => {
    const recipe = {
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      status: 'draft',
      reviewCount: 3,
      author: { id: 'author-id', name: 'Amina Rahman', username: 'amina_kitchen' },
    };
    aggregateRecipesMock.mockResolvedValue([
      {
        items: [recipe],
        metadata: [{ total: 21 }],
      },
    ]);

    await expect(
      listAdminRecipes({
        page: 2,
        limit: 10,
        search: 'claypot rice',
        status: 'draft',
        sort: 'updated',
      }),
    ).resolves.toEqual({
      items: [recipe],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        $text: { $search: 'claypot rice' },
        status: 'draft',
      },
    });
    expect(pipeline[1]).toEqual({ $sort: { updatedAt: -1, _id: -1 } });
    const facet = pipeline[2]?.$facet as { items: Array<Record<string, unknown>> };
    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 10 }, { $limit: 10 }]);
  });

  it('returns an empty first page when no recipes match', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await expect(listAdminRecipes({ page: 1, limit: 10, sort: 'newest' })).resolves.toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('projects only moderation fields from recipe and author records', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await listAdminRecipes({ page: 1, limit: 10, sort: 'oldest' });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const facet = pipeline[2]?.$facet as { items: Array<Record<string, unknown>> };
    const project = facet.items.at(-1);

    expect(project).toHaveProperty('$project.id');
    expect(project).toHaveProperty('$project.reviewCount');
    expect(project).toHaveProperty('$project.author.username');
    expect(project).not.toHaveProperty('$project.imagePublicId');
    expect(project).not.toHaveProperty('$project.author.email');
  });
});
