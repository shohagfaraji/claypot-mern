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

import { listPublishedRecipes } from '../../src/services/recipe.service.js';

const defaultQuery = {
  page: 1,
  limit: 12,
  tags: [] as string[],
  sort: 'newest' as const,
};

describe('published recipe listing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns recipe summaries with pagination metadata', async () => {
    const item = {
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      summary: 'A comforting rice dish cooked with warming spices.',
      imageUrl: null,
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      totalTimeMinutes: 55,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice'],
      publishedAt: new Date('2026-08-05T08:00:00.000Z'),
      author: {
        id: 'user-id',
        name: 'Amina Rahman',
        username: 'amina_kitchen',
        avatarUrl: null,
      },
    };

    aggregateRecipesMock.mockResolvedValue([
      {
        items: [item],
        metadata: [{ total: 25 }],
      },
    ]);

    await expect(listPublishedRecipes(defaultQuery)).resolves.toEqual({
      items: [item],
      pagination: {
        page: 1,
        limit: 12,
        total: 25,
        totalPages: 3,
      },
    });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(pipeline[0]).toEqual({ $match: { status: 'published' } });
    expect(pipeline[1]).toEqual({
      $addFields: {
        totalTimeMinutes: { $add: ['$prepTimeMinutes', '$cookTimeMinutes'] },
      },
    });
    expect(pipeline[2]).toEqual({ $sort: { publishedAt: -1, _id: -1 } });
    const facet = pipeline[3]?.$facet as {
      items: Array<Record<string, unknown>>;
      metadata: Array<Record<string, unknown>>;
    };

    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 0 }, { $limit: 12 }]);
    expect(facet.metadata).toEqual([{ $count: 'total' }]);
  });

  it('builds controlled search and filter expressions', async () => {
    aggregateRecipesMock.mockResolvedValue([{ items: [], metadata: [] }]);

    await listPublishedRecipes({
      page: 2,
      limit: 6,
      search: 'claypot rice',
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
      sort: 'quickest',
    });

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(pipeline[0]).toEqual({
      $match: {
        status: 'published',
        $text: { $search: 'claypot rice' },
        difficulty: 'medium',
        cuisine: /^South Asian$/i,
        category: /^Main course$/i,
        tags: { $all: ['rice', 'comfort food'] },
      },
    });
    expect(pipeline[2]).toEqual({
      $sort: { totalTimeMinutes: 1, publishedAt: -1 },
    });
    const facet = pipeline[3]?.$facet as {
      items: Array<Record<string, unknown>>;
    };

    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 6 }, { $limit: 6 }]);
  });

  it('returns empty pagination data when no recipes match', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await expect(listPublishedRecipes(defaultQuery)).resolves.toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('can scope published recipes to one author', async () => {
    const authorId = '507f1f77bcf86cd799439011';
    aggregateRecipesMock.mockResolvedValue([]);

    await listPublishedRecipes(defaultQuery, authorId);

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        status: 'published',
        author: new Types.ObjectId(authorId),
      },
    });
  });
});
