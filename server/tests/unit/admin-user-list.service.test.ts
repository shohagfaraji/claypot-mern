import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateUsersMock } = vi.hoisted(() => ({
  aggregateUsersMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {},
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {},
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    aggregate: aggregateUsersMock,
  },
}));

import { listAdminUsers } from '../../src/services/admin.service.js';

describe('admin user listing service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a filtered and paginated user directory', async () => {
    const user = {
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      role: 'user',
      isEmailVerified: true,
      recipeCount: 5,
      reviewCount: 8,
    };
    aggregateUsersMock.mockResolvedValue([
      {
        items: [user],
        metadata: [{ total: 14 }],
      },
    ]);

    await expect(
      listAdminUsers({
        page: 2,
        limit: 10,
        search: 'amina+',
        role: 'user',
        verification: 'verified',
        sort: 'recent-login',
      }),
    ).resolves.toEqual({
      items: [user],
      pagination: {
        page: 2,
        limit: 10,
        total: 14,
        totalPages: 2,
      },
    });

    const pipeline = aggregateUsersMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        $or: [{ name: /amina\+/i }, { username: /amina\+/i }, { email: /amina\+/i }],
        role: 'user',
        isEmailVerified: true,
      },
    });
    expect(pipeline[1]).toEqual({ $sort: { lastLoginAt: -1, _id: -1 } });
    const facet = pipeline[2]?.$facet as { items: Array<Record<string, unknown>> };
    expect(facet.items.slice(0, 2)).toEqual([{ $skip: 10 }, { $limit: 10 }]);
  });

  it('returns an empty first page when no users match', async () => {
    aggregateUsersMock.mockResolvedValue([]);

    await expect(listAdminUsers({ page: 1, limit: 10, sort: 'newest' })).resolves.toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('projects activity totals without password or private media fields', async () => {
    aggregateUsersMock.mockResolvedValue([]);

    await listAdminUsers({ page: 1, limit: 10, sort: 'name' });

    const pipeline = aggregateUsersMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const facet = pipeline[2]?.$facet as { items: Array<Record<string, unknown>> };
    const project = facet.items.at(-1);

    expect(project).toHaveProperty('$project.recipeCount');
    expect(project).toHaveProperty('$project.reviewCount');
    expect(project).toHaveProperty('$project.email');
    expect(project).not.toHaveProperty('$project.passwordHash');
    expect(project).not.toHaveProperty('$project.avatarPublicId');
  });
});
