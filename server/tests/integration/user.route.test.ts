import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const { getPublicUserIdMock, getPublicUserProfileMock, listPublishedRecipesMock } = vi.hoisted(
  () => ({
    getPublicUserIdMock: vi.fn(),
    getPublicUserProfileMock: vi.fn(),
    listPublishedRecipesMock: vi.fn(),
  }),
);

vi.mock('../../src/services/user-profile.service.js', () => ({
  getPublicUserId: getPublicUserIdMock,
  getPublicUserProfile: getPublicUserProfileMock,
}));

vi.mock('../../src/services/recipe.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/recipe.service.js')>()),
  listPublishedRecipes: listPublishedRecipesMock,
}));

import { createApp } from '../../src/app.js';

describe('GET /api/v1/users/:username', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a public cook profile without private account fields', async () => {
    getPublicUserProfileMock.mockResolvedValue({
      id: 'user-id',
      name: 'Amina Noor',
      username: 'amina_kitchen',
      avatarUrl: null,
      bio: 'Home cook and recipe collector.',
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      publishedRecipeCount: 7,
      followerCount: 18,
      followingCount: 6,
    });

    const response = await request(app).get('/api/v1/users/Amina_Kitchen').expect(200);

    expect(getPublicUserProfileMock).toHaveBeenCalledWith('amina_kitchen');
    expect(response.body.data.user).toMatchObject({
      username: 'amina_kitchen',
      publishedRecipeCount: 7,
      followerCount: 18,
      followingCount: 6,
    });
    expect(response.body.data.user).not.toHaveProperty('email');
    expect(response.body.data.user).not.toHaveProperty('role');
  });

  it('returns not found for an unknown username', async () => {
    getPublicUserProfileMock.mockRejectedValue(
      new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.'),
    );

    const response = await request(app).get('/api/v1/users/missing_user').expect(404);

    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });
});

describe('GET /api/v1/users/:username/recipes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a filtered page of the cook published recipes', async () => {
    getPublicUserIdMock.mockResolvedValue('507f1f77bcf86cd799439011');
    listPublishedRecipesMock.mockResolvedValue({
      items: [{ id: 'recipe-id', title: 'Spiced Claypot Rice' }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/users/amina_kitchen/recipes')
      .query({ limit: '9', difficulty: 'medium', sort: 'quickest' })
      .expect(200);

    expect(listPublishedRecipesMock).toHaveBeenCalledWith(
      {
        page: 1,
        limit: 9,
        difficulty: 'medium',
        tags: [],
        sort: 'quickest',
      },
      '507f1f77bcf86cd799439011',
    );
    expect(response.body.data.pagination.total).toBe(1);
  });

  it('validates the username and query before service work', async () => {
    const response = await request(app)
      .get('/api/v1/users/invalid-name/recipes')
      .query({ limit: '100' })
      .expect(400);

    expect(getPublicUserIdMock).not.toHaveBeenCalled();
    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
