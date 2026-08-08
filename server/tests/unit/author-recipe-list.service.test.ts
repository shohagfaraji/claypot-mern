import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateRecipesMock } = vi.hoisted(() => ({
  aggregateRecipesMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    aggregate: aggregateRecipesMock,
  },
}));

import { listAuthorRecipes } from '../../src/services/recipe.service.js';

const authorId = '507f1f77bcf86cd799439011';

describe('author recipe listing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the current author recipes with pagination', async () => {
    const item = {
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      status: 'draft',
      totalTimeMinutes: 55,
    };

    aggregateRecipesMock.mockResolvedValue([
      {
        items: [item],
        metadata: [{ total: 13 }],
      },
    ]);

    await expect(
      listAuthorRecipes(authorId, {
        page: 1,
        limit: 12,
        sort: 'updated',
      }),
    ).resolves.toEqual({
      items: [item],
      pagination: {
        page: 1,
        limit: 12,
        total: 13,
        totalPages: 2,
      },
    });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(pipeline[0]).toEqual({
      $match: {
        author: new Types.ObjectId(authorId),
      },
    });
    expect(pipeline[2]).toEqual({
      $sort: { updatedAt: -1, _id: -1 },
    });
  });

  it('adds status and search filters without accepting another author', async () => {
    aggregateRecipesMock.mockResolvedValue([{ items: [], metadata: [] }]);

    await listAuthorRecipes(authorId, {
      page: 2,
      limit: 6,
      search: 'claypot rice',
      status: 'published',
      sort: 'oldest',
    });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(pipeline[0]).toEqual({
      $match: {
        author: new Types.ObjectId(authorId),
        $text: { $search: 'claypot rice' },
        status: 'published',
      },
    });
    expect(pipeline[2]).toEqual({
      $sort: { createdAt: 1, _id: 1 },
    });
    const facet = pipeline[3]?.$facet as {
      items: Array<Record<string, unknown>>;
    };

    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 6 }, { $limit: 6 }]);
  });

  it('returns empty metadata when the author has no recipes', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await expect(
      listAuthorRecipes(authorId, {
        page: 1,
        limit: 12,
        sort: 'updated',
      }),
    ).resolves.toMatchObject({
      items: [],
      pagination: {
        total: 0,
        totalPages: 0,
      },
    });
  });
});
