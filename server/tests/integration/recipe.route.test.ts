import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const {
  createRecipeMock,
  deleteRecipeMock,
  getAuthorRecipeMock,
  getPublishedRecipeBySlugMock,
  isRecipeSavedMock,
  listAuthorRecipesMock,
  listPublishedRecipesMock,
  listSavedRecipesMock,
  publishRecipeMock,
  saveRecipeMock,
  unsaveRecipeMock,
  unpublishRecipeMock,
  updateRecipeMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  deleteRecipeMock: vi.fn(),
  getAuthorRecipeMock: vi.fn(),
  getPublishedRecipeBySlugMock: vi.fn(),
  isRecipeSavedMock: vi.fn(),
  listAuthorRecipesMock: vi.fn(),
  listPublishedRecipesMock: vi.fn(),
  listSavedRecipesMock: vi.fn(),
  publishRecipeMock: vi.fn(),
  saveRecipeMock: vi.fn(),
  unsaveRecipeMock: vi.fn(),
  unpublishRecipeMock: vi.fn(),
  updateRecipeMock: vi.fn(),
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
  deleteRecipe: deleteRecipeMock,
  getAuthorRecipe: getAuthorRecipeMock,
  getPublishedRecipeBySlug: getPublishedRecipeBySlugMock,
  listAuthorRecipes: listAuthorRecipesMock,
  listPublishedRecipes: listPublishedRecipesMock,
  publishRecipe: publishRecipeMock,
  unpublishRecipe: unpublishRecipeMock,
  updateRecipe: updateRecipeMock,
}));

vi.mock('../../src/services/saved-recipe.service.js', () => ({
  isRecipeSaved: isRecipeSavedMock,
  listSavedRecipes: listSavedRecipesMock,
  saveRecipe: saveRecipeMock,
  unsaveRecipe: unsaveRecipeMock,
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

describe('GET /api/v1/recipes/saved', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the authenticated user saved recipe collection', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    listSavedRecipesMock.mockResolvedValue({
      items: [
        {
          id: '507f1f77bcf86cd799439012',
          title: 'Spiced Claypot Rice',
          savedAt: new Date('2026-08-11T08:00:00.000Z'),
        },
      ],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/recipes/saved')
      .set('Authorization', 'Bearer signed-access-token')
      .query({ limit: '9', search: ' rice ', sort: 'saved' })
      .expect(200);

    expect(listSavedRecipesMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      page: 1,
      limit: 9,
      search: 'rice',
      sort: 'saved',
      tags: [],
    });
    expect(response.body).toMatchObject({
      data: {
        recipes: [{ id: '507f1f77bcf86cd799439012' }],
        pagination: { total: 1 },
      },
    });
  });

  it('authenticates before validating saved recipe filters', async () => {
    const response = await request(app)
      .get('/api/v1/recipes/saved')
      .query({ limit: '100' })
      .expect(401);

    expect(listSavedRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PUT /api/v1/recipes/:recipeId/save', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('idempotently saves a published recipe', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    saveRecipeMock.mockResolvedValue(undefined);

    await request(app)
      .put(`/api/v1/recipes/${recipeId}/save`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(saveRecipeMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', recipeId);
  });

  it('does not expose missing or private recipes', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    saveRecipeMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}/save`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(404);

    expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
  });
});

describe('GET /api/v1/recipes/:recipeId/save', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the current user saved state', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    isRecipeSavedMock.mockResolvedValue(true);

    const response = await request(app)
      .get(`/api/v1/recipes/${recipeId}/save`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(isRecipeSavedMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', recipeId);
    expect(response.body).toEqual({ data: { isSaved: true } });
  });

  it('authenticates before validating the recipe ID', async () => {
    const response = await request(app).get('/api/v1/recipes/invalid-id/save').expect(401);

    expect(isRecipeSavedMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('DELETE /api/v1/recipes/:recipeId/save', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('idempotently removes a recipe from the current user collection', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    unsaveRecipeMock.mockResolvedValue(undefined);

    await request(app)
      .delete(`/api/v1/recipes/${recipeId}/save`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(unsaveRecipeMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', recipeId);
  });

  it('authenticates before validating the recipe ID', async () => {
    const response = await request(app).delete('/api/v1/recipes/invalid-id/save').expect(401);

    expect(unsaveRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/v1/recipes/:slug', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a published recipe without authentication', async () => {
    getPublishedRecipeBySlugMock.mockResolvedValue({
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
      instructions: [{ step: 1, description: 'Rinse the rice thoroughly.' }],
      author: {
        id: 'user-id',
        name: 'Amina Rahman',
        username: 'amina_kitchen',
        avatarUrl: null,
      },
    });

    const response = await request(app).get('/api/v1/recipes/Spiced-Claypot-Rice').expect(200);

    expect(getPublishedRecipeBySlugMock).toHaveBeenCalledWith('spiced-claypot-rice');
    expect(response.body).toMatchObject({
      data: {
        recipe: {
          id: 'recipe-id',
          slug: 'spiced-claypot-rice',
          ingredients: expect.any(Array),
          instructions: expect.any(Array),
        },
      },
    });
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed slug before querying MongoDB', async () => {
    const response = await request(app).get('/api/v1/recipes/invalid_slug').expect(400);

    expect(getPublishedRecipeBySlugMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for a missing or unpublished recipe', async () => {
    getPublishedRecipeBySlugMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app).get('/api/v1/recipes/missing-recipe').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'RECIPE_NOT_FOUND',
        message: 'Recipe was not found.',
      },
    });
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

describe('PATCH /api/v1/recipes/:recipeId/publish', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('publishes an owned recipe', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    publishRecipeMock.mockResolvedValue({
      id: recipeId,
      status: 'published',
      publishedAt: new Date('2026-08-07T08:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/publish`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(publishRecipeMock).toHaveBeenCalledWith(recipeId, {
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    expect(response.body).toMatchObject({
      data: {
        recipe: {
          id: recipeId,
          status: 'published',
        },
      },
    });
  });

  it('authenticates before validating the recipe ID', async () => {
    const response = await request(app).patch('/api/v1/recipes/invalid-id/publish').expect(401);

    expect(publishRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid recipe ID after authentication', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });

    const response = await request(app)
      .patch('/api/v1/recipes/invalid-id/publish')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(400);

    expect(publishRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found when the recipe is missing or not owned', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    publishRecipeMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/publish`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(404);

    expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
  });
});

describe('PATCH /api/v1/recipes/:recipeId/unpublish', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an owned published recipe to draft status', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    unpublishRecipeMock.mockResolvedValue({
      id: recipeId,
      status: 'draft',
      publishedAt: null,
    });

    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/unpublish`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(unpublishRecipeMock).toHaveBeenCalledWith(recipeId, {
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    expect(response.body).toMatchObject({
      data: {
        recipe: {
          id: recipeId,
          status: 'draft',
          publishedAt: null,
        },
      },
    });
  });

  it('authenticates before validating the recipe ID', async () => {
    const response = await request(app).patch('/api/v1/recipes/invalid-id/unpublish').expect(401);

    expect(unpublishRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns not found when the recipe is missing or not owned', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    unpublishRecipeMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/unpublish`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(404);

    expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
  });
});

describe('GET /api/v1/recipes/mine', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns only the authenticated author recipes', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    listAuthorRecipesMock.mockResolvedValue({
      items: [
        {
          id: 'recipe-id',
          title: 'Spiced Claypot Rice',
          slug: 'spiced-claypot-rice',
          status: 'draft',
          totalTimeMinutes: 55,
        },
      ],
      pagination: {
        page: 1,
        limit: 6,
        total: 1,
        totalPages: 1,
      },
    });

    const response = await request(app)
      .get('/api/v1/recipes/mine')
      .set('Authorization', 'Bearer signed-access-token')
      .query({
        limit: '6',
        status: 'draft',
        sort: 'updated',
      })
      .expect(200);

    expect(listAuthorRecipesMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      page: 1,
      limit: 6,
      status: 'draft',
      sort: 'updated',
    });
    expect(response.body).toMatchObject({
      data: {
        recipes: [
          {
            id: 'recipe-id',
            status: 'draft',
          },
        ],
        pagination: {
          total: 1,
          totalPages: 1,
        },
      },
    });
    expect(getPublishedRecipeBySlugMock).not.toHaveBeenCalled();
  });

  it('rejects requests without authentication', async () => {
    const response = await request(app).get('/api/v1/recipes/mine').expect(401);

    expect(listAuthorRecipesMock).not.toHaveBeenCalled();
    expect(getPublishedRecipeBySlugMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid dashboard filters before querying MongoDB', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });

    const response = await request(app)
      .get('/api/v1/recipes/mine')
      .set('Authorization', 'Bearer signed-access-token')
      .query({ status: 'archived' })
      .expect(400);

    expect(listAuthorRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/recipes/mine/:recipeId', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a complete recipe owned by the authenticated author', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    getAuthorRecipeMock.mockResolvedValue({
      id: recipeId,
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      status: 'draft',
      ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
      instructions: [{ step: 1, description: 'Rinse the rice thoroughly.' }],
    });

    const response = await request(app)
      .get(`/api/v1/recipes/mine/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(getAuthorRecipeMock).toHaveBeenCalledWith(recipeId, {
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    expect(response.body).toMatchObject({
      data: {
        recipe: {
          id: recipeId,
          status: 'draft',
          ingredients: expect.any(Array),
          instructions: expect.any(Array),
        },
      },
    });
  });

  it('authenticates before validating the recipe identifier', async () => {
    const response = await request(app).get('/api/v1/recipes/mine/invalid-id').expect(401);

    expect(getAuthorRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PUT /api/v1/recipes/:recipeId', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('updates a recipe owned by the authenticated author', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    updateRecipeMock.mockResolvedValue({
      id: recipeId,
      slug: 'spiced-claypot-rice',
      status: 'draft',
      ...recipeBody,
    });

    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send(recipeBody)
      .expect(200);

    expect(updateRecipeMock).toHaveBeenCalledWith(
      recipeId,
      {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      {
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
      },
    );
    expect(response.body.data.recipe.id).toBe(recipeId);
  });

  it('rejects invalid updates before calling the recipe service', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });

    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ ...recipeBody, instructions: [] })
      .expect(400);

    expect(updateRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found without revealing recipe ownership', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    updateRecipeMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send(recipeBody)
      .expect(404);

    expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
  });
});

describe('DELETE /api/v1/recipes/:recipeId', () => {
  const app = createApp();
  const recipeId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deletes a recipe owned by the authenticated author', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    deleteRecipeMock.mockResolvedValue(undefined);

    const response = await request(app)
      .delete(`/api/v1/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(deleteRecipeMock).toHaveBeenCalledWith(recipeId, {
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    expect(response.text).toBe('');
  });

  it('authenticates before validating the recipe identifier', async () => {
    const response = await request(app).delete('/api/v1/recipes/invalid-id').expect(401);

    expect(deleteRecipeMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns not found without revealing recipe ownership', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });
    deleteRecipeMock.mockRejectedValue(
      new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.'),
    );

    const response = await request(app)
      .delete(`/api/v1/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(404);

    expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
  });
});
