import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateRecipesMock, aggregateUsersMock } = vi.hoisted(() => ({
  aggregateRecipesMock: vi.fn(),
  aggregateUsersMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { aggregate: aggregateRecipesMock },
}));
vi.mock('../../src/models/user.model.js', () => ({
  UserModel: { aggregate: aggregateUsersMock },
}));

import {
  getRecipeDiscoveryFacets,
  listDiscoverableCooks,
} from '../../src/services/discovery.service.js';

describe('discovery service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns bounded facets from published recipes', async () => {
    const facets = {
      cuisines: [{ value: 'Bangladeshi', count: 8 }],
      categories: [{ value: 'Main course', count: 12 }],
      tags: [{ value: 'rice', count: 7 }],
    };
    aggregateRecipesMock.mockResolvedValue([facets]);

    await expect(getRecipeDiscoveryFacets()).resolves.toEqual(facets);

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: { status: 'published' } });
    expect(pipeline[1]).toMatchObject({
      $facet: {
        cuisines: expect.arrayContaining([{ $limit: 24 }]),
        categories: expect.arrayContaining([{ $limit: 24 }]),
        tags: expect.arrayContaining([{ $limit: 30 }]),
      },
    });
  });

  it('returns empty facet groups when no published recipes exist', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await expect(getRecipeDiscoveryFacets()).resolves.toEqual({
      cuisines: [],
      categories: [],
      tags: [],
    });
  });

  it('lists searchable cooks with public metrics and pagination', async () => {
    const cook = {
      id: 'cook-id',
      name: 'Amina Noor',
      username: 'amina_kitchen',
      avatarUrl: null,
      bio: 'Home cook.',
      publishedRecipeCount: 7,
      followerCount: 18,
      createdAt: new Date('2026-08-01T08:00:00.000Z'),
    };
    aggregateUsersMock.mockResolvedValue([{ items: [cook], metadata: [{ total: 13 }] }]);

    await expect(
      listDiscoverableCooks({ page: 2, limit: 12, search: 'Amina.*', sort: 'popular' }),
    ).resolves.toEqual({
      items: [cook],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    });

    const pipeline = aggregateUsersMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const match = pipeline[0]?.$match as { $or: Array<Record<string, RegExp>> };
    expect(match.$or.map((entry) => Object.values(entry)[0]?.source)).toEqual([
      'Amina\\.\\*',
      'Amina\\.\\*',
      'Amina\\.\\*',
    ]);
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $match: { publishedRecipeCount: { $gt: 0 } } }),
        {
          $sort: {
            followerCount: -1,
            publishedRecipeCount: -1,
            createdAt: -1,
            _id: -1,
          },
        },
      ]),
    );
    const facet = pipeline.at(-1)?.$facet as { items: Array<Record<string, unknown>> };
    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 12 }, { $limit: 12 }]);
  });

  it.each([
    ['newest', { createdAt: -1, _id: -1 }],
    ['name', { sortName: 1, _id: 1 }],
  ] as const)('applies the %s cook sort', async (sort, expectedSort) => {
    aggregateUsersMock.mockResolvedValue([]);

    await expect(listDiscoverableCooks({ page: 1, limit: 12, sort })).resolves.toMatchObject({
      items: [],
      pagination: { total: 0, totalPages: 0 },
    });

    const pipeline = aggregateUsersMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: {} });
    expect(pipeline).toContainEqual({ $sort: expectedSort });
  });
});
