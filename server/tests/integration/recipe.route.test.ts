import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRecipeMock, listPublishedRecipesMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  listPublishedRecipesMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  createAccessToken: vi.fn(),
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/auth.service.js', () => ({
  authenticateUser: vi.fn(),
  getCurrentUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../../src/services/session.service.js', () => ({
  createAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
  rotateAuthSession: vi.fn(),
}));

vi.mock('../../src/services/recipe.service.js', () => ({
  createRecipe: createRecipeMock,
  listPublishedRecipes: listPublishedRecipesMock,
}));

import { createApp } from '../../src/app.js';

const recipeBody = {
  title: '  Spiced Claypot Rice  ',
  summary: '  A comforting rice dish cooked with warming spices.  ',
  ingredients: [{ name: '  Basmati rice  ', quantity: '  2 cups  ' }],
  instructions: [{ description: '  Rinse the rice until the water runs clear.  ' }],
  prepTimeMinutes: 15,
  cookTimeMinutes: 40,
  servings: 4,
  difficulty: 'medium',
  cuisine: '  South Asian  ',
  category: '  Main course  ',
  tags: ['  Rice  ', 'Comfort Food', 'rice'],
};

describe('GET /api/v1/recipes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns public recipe summaries and pagination', async () => {
    listPublishedRecipesMock.mockResolvedValue({
      items: [
        {
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
        },
      ],
      pagination: {
        page: 2,
        limit: 6,
        total: 7,
        totalPages: 2,
      },
    });

    const response = await request(app)
      .get('/api/v1/recipes')
      .query({
        page: '2',
        limit: '6',
        search: '  claypot rice  ',
        difficulty: 'medium',
        tags: 'Rice,Comfort Food,rice',
        sort: 'quickest',
      })
      .expect(200);

    expect(listPublishedRecipesMock).toHaveBeenCalledWith({
      page: 2,
      limit: 6,
      search: 'claypot rice',
      difficulty: 'medium',
      tags: ['rice', 'comfort food'],
      sort: 'quickest',
    });
    expect(response.body).toMatchObject({
      data: {
        recipes: [
          {
            id: 'recipe-id',
            slug: 'spiced-claypot-rice',
            totalTimeMinutes: 55,
          },
        ],
        pagination: {
          page: 2,
          limit: 6,
          total: 7,
          totalPages: 2,
        },
      },
    });
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it('applies default listing parameters', async () => {
    listPublishedRecipesMock.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
      },
    });

    await request(app).get('/api/v1/recipes').expect(200);

    expect(listPublishedRecipesMock).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      tags: [],
      sort: 'newest',
    });
  });

  it('rejects invalid listing parameters before querying MongoDB', async () => {
    const response = await request(app)
      .get('/api/v1/recipes')
      .query({
        page: '0',
        sort: 'unsupported',
      })
      .expect(400);

    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/recipes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a draft owned by the authenticated user', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    createRecipeMock.mockResolvedValue({
      id: 'recipe-id',
      author: '507f1f77bcf86cd799439011',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      summary: 'A comforting rice dish cooked with warming spices.',
      imageUrl: null,
      ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
      instructions: [
        {
          step: 1,
          description: 'Rinse the rice until the water runs clear.',
        },
      ],
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      servings: 4,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
      status: 'draft',
      publishedAt: null,
      createdAt: new Date('2026-08-05T08:00:00.000Z'),
      updatedAt: new Date('2026-08-05T08:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/recipes')
      .set('Authorization', 'Bearer signed-access-token')
      .send(recipeBody)
      .expect(201);

    expect(createRecipeMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      title: 'Spiced Claypot Rice',
      summary: 'A comforting rice dish cooked with warming spices.',
      ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
      instructions: [{ description: 'Rinse the rice until the water runs clear.' }],
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      servings: 4,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
    });
    expect(response.body).toMatchObject({
      data: {
        recipe: {
          id: 'recipe-id',
          author: '507f1f77bcf86cd799439011',
          slug: 'spiced-claypot-rice',
          status: 'draft',
        },
      },
    });
  });

  it('rejects invalid recipe input before persistence', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });

    const response = await request(app)
      .post('/api/v1/recipes')
      .set('Authorization', 'Bearer signed-access-token')
      .send({
        ...recipeBody,
        ingredients: [],
      })
      .expect(400);

    expect(createRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('authenticates before validating recipe input', async () => {
    const response = await request(app).post('/api/v1/recipes').send({}).expect(401);

    expect(createRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
