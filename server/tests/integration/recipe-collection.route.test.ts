import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addRecipeMock,
  createCollectionMock,
  deleteCollectionMock,
  listCollectionRecipesMock,
  listCollectionsMock,
  listMembershipsMock,
  removeRecipeMock,
  updateCollectionMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  addRecipeMock: vi.fn(),
  createCollectionMock: vi.fn(),
  deleteCollectionMock: vi.fn(),
  listCollectionRecipesMock: vi.fn(),
  listCollectionsMock: vi.fn(),
  listMembershipsMock: vi.fn(),
  removeRecipeMock: vi.fn(),
  updateCollectionMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));
vi.mock('../../src/services/recipe-collection.service.js', () => ({
  addRecipeToCollection: addRecipeMock,
  createRecipeCollection: createCollectionMock,
  deleteRecipeCollection: deleteCollectionMock,
  listCollectionRecipes: listCollectionRecipesMock,
  listRecipeCollectionMemberships: listMembershipsMock,
  listRecipeCollections: listCollectionsMock,
  removeRecipeFromCollection: removeRecipeMock,
  updateRecipeCollection: updateCollectionMock,
}));

import { createApp } from '../../src/app.js';

const userId = '507f1f77bcf86cd799439011';
const collectionId = '507f1f77bcf86cd799439012';
const recipeId = '507f1f77bcf86cd799439013';

describe('recipe collection routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    verifyAccessTokenMock.mockResolvedValue({ userId, role: 'user' });
  });

  it('lists and creates owned collections', async () => {
    listCollectionsMock.mockResolvedValue([{ id: collectionId, name: 'Weeknight dinners' }]);
    createCollectionMock.mockResolvedValue({ id: collectionId, name: 'Weeknight dinners' });

    const listResponse = await request(app)
      .get('/api/v1/collections')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);
    const createResponse = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer signed-access-token')
      .send({ name: '  Weeknight   dinners  ', description: null })
      .expect(201);

    expect(listResponse.body.data.collections).toHaveLength(1);
    expect(createCollectionMock).toHaveBeenCalledWith(userId, {
      name: 'Weeknight dinners',
      description: null,
    });
    expect(createResponse.body.data.collection.id).toBe(collectionId);
  });

  it('updates and deletes an owned collection', async () => {
    updateCollectionMock.mockResolvedValue({ id: collectionId, name: 'Weekend projects' });

    await request(app)
      .patch(`/api/v1/collections/${collectionId.toUpperCase()}`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ name: 'Weekend projects', description: 'Recipes worth extra time.' })
      .expect(200);
    await request(app)
      .delete(`/api/v1/collections/${collectionId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(updateCollectionMock).toHaveBeenCalledWith(userId, collectionId, {
      name: 'Weekend projects',
      description: 'Recipes worth extra time.',
    });
    expect(deleteCollectionMock).toHaveBeenCalledWith(userId, collectionId);
  });

  it('returns a filtered collection recipe page', async () => {
    listCollectionRecipesMock.mockResolvedValue({
      collection: { id: collectionId, name: 'Weeknight dinners' },
      recipes: {
        items: [{ id: recipeId }],
        pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
      },
    });

    const response = await request(app)
      .get(`/api/v1/collections/${collectionId}/recipes?limit=9&difficulty=easy`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listCollectionRecipesMock).toHaveBeenCalledWith(userId, collectionId, {
      page: 1,
      limit: 9,
      difficulty: 'easy',
      tags: [],
      sort: 'saved',
    });
    expect(response.body.data).toMatchObject({
      collection: { id: collectionId },
      recipes: [{ id: recipeId }],
      pagination: { total: 1 },
    });
  });

  it('lists and updates recipe memberships', async () => {
    listMembershipsMock.mockResolvedValue([{ id: collectionId, containsRecipe: true }]);

    const response = await request(app)
      .get(`/api/v1/collections/memberships/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);
    await request(app)
      .put(`/api/v1/collections/${collectionId}/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);
    await request(app)
      .delete(`/api/v1/collections/${collectionId}/recipes/${recipeId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(response.body.data.collections[0].containsRecipe).toBe(true);
    expect(listMembershipsMock).toHaveBeenCalledWith(userId, recipeId);
    expect(addRecipeMock).toHaveBeenCalledWith(userId, collectionId, recipeId);
    expect(removeRecipeMock).toHaveBeenCalledWith(userId, collectionId, recipeId);
  });

  it('authenticates before validating collection input', async () => {
    verifyAccessTokenMock.mockRejectedValue(new Error('invalid token'));

    await request(app).post('/api/v1/collections').send({ name: 'A' }).expect(401);
    expect(createCollectionMock).not.toHaveBeenCalled();
  });
});
