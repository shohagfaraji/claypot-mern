import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aggregateRecipesMock,
  aggregateUsersMock,
  countRecipesMock,
  countReviewsMock,
  countUsersMock,
} = vi.hoisted(() => ({
  aggregateRecipesMock: vi.fn(),
  aggregateUsersMock: vi.fn(),
  countRecipesMock: vi.fn(),
  countReviewsMock: vi.fn(),
  countUsersMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    aggregate: aggregateRecipesMock,
    countDocuments: countRecipesMock,
  },
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {
    countDocuments: countReviewsMock,
  },
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    aggregate: aggregateUsersMock,
    countDocuments: countUsersMock,
  },
}));

import { getAdminDashboard } from '../../src/services/admin.service.js';

describe('admin dashboard service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns platform totals and recent activity', async () => {
    const recentRecipe = {
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      status: 'published',
      createdAt: new Date('2026-08-12T08:00:00.000Z'),
      author: { name: 'Amina Rahman', username: 'amina_kitchen' },
    };
    const recentUser = {
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      avatarUrl: null,
      role: 'user',
      createdAt: new Date('2026-08-11T08:00:00.000Z'),
    };

    countUsersMock.mockResolvedValue(42);
    countRecipesMock.mockResolvedValueOnce(28).mockResolvedValueOnce(19).mockResolvedValueOnce(9);
    countReviewsMock.mockResolvedValue(67);
    aggregateRecipesMock.mockResolvedValue([recentRecipe]);
    aggregateUsersMock.mockResolvedValue([recentUser]);

    await expect(getAdminDashboard()).resolves.toEqual({
      metrics: {
        totalUsers: 42,
        totalRecipes: 28,
        publishedRecipes: 19,
        draftRecipes: 9,
        totalReviews: 67,
      },
      recentRecipes: [recentRecipe],
      recentUsers: [recentUser],
    });

    expect(countUsersMock).toHaveBeenCalledWith({});
    expect(countRecipesMock).toHaveBeenNthCalledWith(1, {});
    expect(countRecipesMock).toHaveBeenNthCalledWith(2, { status: 'published' });
    expect(countRecipesMock).toHaveBeenNthCalledWith(3, { status: 'draft' });
    expect(countReviewsMock).toHaveBeenCalledWith({});
  });

  it('limits and projects recent records without sensitive user fields', async () => {
    countUsersMock.mockResolvedValue(0);
    countRecipesMock.mockResolvedValue(0);
    countReviewsMock.mockResolvedValue(0);
    aggregateRecipesMock.mockResolvedValue([]);
    aggregateUsersMock.mockResolvedValue([]);

    await getAdminDashboard();

    const recipePipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;
    const userPipeline = aggregateUsersMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(recipePipeline.slice(0, 2)).toEqual([
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 5 },
    ]);
    expect(userPipeline.slice(0, 2)).toEqual([
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 5 },
    ]);
    expect(userPipeline[2]).toEqual({
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        username: 1,
        avatarUrl: 1,
        role: 1,
        createdAt: 1,
      },
    });
  });
});
