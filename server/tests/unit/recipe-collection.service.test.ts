import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aggregateMock,
  collectionCountMock,
  collectionCreateMock,
  collectionExistsMock,
  deleteCollectionMock,
  endSessionMock,
  findSavedRecipeMock,
  listSavedRecipesMock,
  recipeExistsMock,
  savedRecipeSelectMock,
  startSessionMock,
  updateCollectionMock,
  updateManySavedRecipesMock,
  updateSavedRecipeMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
  collectionCountMock: vi.fn(),
  collectionCreateMock: vi.fn(),
  collectionExistsMock: vi.fn(),
  deleteCollectionMock: vi.fn(),
  endSessionMock: vi.fn(),
  findSavedRecipeMock: vi.fn(),
  listSavedRecipesMock: vi.fn(),
  recipeExistsMock: vi.fn(),
  savedRecipeSelectMock: vi.fn(),
  startSessionMock: vi.fn(),
  updateCollectionMock: vi.fn(),
  updateManySavedRecipesMock: vi.fn(),
  updateSavedRecipeMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));
vi.mock('../../src/models/recipe-collection.model.js', () => ({
  RecipeCollectionModel: {
    aggregate: aggregateMock,
    countDocuments: collectionCountMock,
    create: collectionCreateMock,
    exists: collectionExistsMock,
    findOneAndDelete: deleteCollectionMock,
    findOneAndUpdate: updateCollectionMock,
  },
}));
vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { exists: recipeExistsMock },
}));
vi.mock('../../src/models/saved-recipe.model.js', () => ({
  SavedRecipeModel: {
    findOne: findSavedRecipeMock,
    updateMany: updateManySavedRecipesMock,
    updateOne: updateSavedRecipeMock,
  },
}));
vi.mock('../../src/services/saved-recipe.service.js', () => ({
  listSavedRecipes: listSavedRecipesMock,
}));

import {
  addRecipeToCollection,
  createRecipeCollection,
  deleteRecipeCollection,
  listCollectionRecipes,
  listRecipeCollectionMemberships,
  listRecipeCollections,
  removeRecipeFromCollection,
  updateRecipeCollection,
} from '../../src/services/recipe-collection.service.js';

const userId = '507f1f77bcf86cd799439011';
const collectionId = '507f1f77bcf86cd799439012';
const recipeId = '507f1f77bcf86cd799439013';
const now = new Date('2026-09-02T08:00:00.000Z');
const collection = {
  id: collectionId,
  name: 'Weeknight dinners',
  description: null,
  recipeCount: 2,
  createdAt: now,
  updatedAt: now,
};

describe('recipe collection service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
    findSavedRecipeMock.mockReturnValue({ select: savedRecipeSelectMock });
  });

  it('lists owned collections with published recipe counts', async () => {
    aggregateMock.mockResolvedValue([collection]);

    await expect(listRecipeCollections(userId)).resolves.toEqual([collection]);
    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: { user: new Types.ObjectId(userId) } });
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'saved_recipes' }),
        }),
      ]),
    );
  });

  it('creates a normalized, owned collection', async () => {
    collectionCountMock.mockResolvedValue(2);
    collectionCreateMock.mockResolvedValue({
      ...collection,
      user: new Types.ObjectId(userId),
      normalizedName: 'weeknight dinners',
    });

    await expect(
      createRecipeCollection(userId, { name: 'Weeknight dinners', description: null }),
    ).resolves.toMatchObject({ name: 'Weeknight dinners', recipeCount: 0 });
    expect(collectionCreateMock).toHaveBeenCalledWith({
      user: new Types.ObjectId(userId),
      name: 'Weeknight dinners',
      normalizedName: 'weeknight dinners',
      description: null,
    });
  });

  it('enforces collection count and unique-name limits', async () => {
    collectionCountMock.mockResolvedValueOnce(30);
    await expect(
      createRecipeCollection(userId, { name: 'Favorites', description: null }),
    ).rejects.toMatchObject({ code: 'COLLECTION_LIMIT_REACHED' });

    collectionCountMock.mockResolvedValueOnce(2);
    collectionCreateMock.mockRejectedValue({ code: 11000 });
    await expect(
      createRecipeCollection(userId, { name: 'Favorites', description: null }),
    ).rejects.toMatchObject({ code: 'COLLECTION_NAME_EXISTS' });
  });

  it('updates only an owned collection', async () => {
    updateCollectionMock.mockResolvedValue({ ...collection, normalizedName: 'weeknight dinners' });

    await expect(
      updateRecipeCollection(userId, collectionId, {
        name: 'Weeknight dinners',
        description: 'Fast meals.',
      }),
    ).resolves.toMatchObject({ id: collectionId });
    expect(updateCollectionMock).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(collectionId), user: new Types.ObjectId(userId) },
      {
        $set: {
          name: 'Weeknight dinners',
          normalizedName: 'weeknight dinners',
          description: 'Fast meals.',
        },
      },
      { returnDocument: 'after', runValidators: true },
    );

    updateCollectionMock.mockResolvedValue(null);
    await expect(
      updateRecipeCollection(userId, collectionId, {
        name: 'Missing collection',
        description: null,
      }),
    ).rejects.toMatchObject({ code: 'COLLECTION_NOT_FOUND' });
  });

  it('deletes a collection and removes its saved-recipe references transactionally', async () => {
    deleteCollectionMock.mockResolvedValue(collection);

    await deleteRecipeCollection(userId, collectionId);
    const user = new Types.ObjectId(userId);
    const ownedCollection = new Types.ObjectId(collectionId);
    expect(deleteCollectionMock).toHaveBeenCalledWith(
      { _id: ownedCollection, user },
      { session: expect.any(Object) },
    );
    expect(updateManySavedRecipesMock).toHaveBeenCalledWith(
      { user, collections: ownedCollection },
      { $pull: { collections: ownedCollection } },
      { session: expect.any(Object) },
    );
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('returns an owned collection recipe page', async () => {
    aggregateMock.mockResolvedValue([collection]);
    listSavedRecipesMock.mockResolvedValue({
      items: [{ id: recipeId }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
    });
    const query = { page: 1, limit: 9, tags: [], sort: 'saved' as const };

    await expect(listCollectionRecipes(userId, collectionId, query)).resolves.toMatchObject({
      collection,
      recipes: { items: [{ id: recipeId }] },
    });
    expect(listSavedRecipesMock).toHaveBeenCalledWith(userId, query, collectionId);
  });

  it('adds a published recipe to one owned collection and saves it', async () => {
    collectionExistsMock.mockResolvedValue({ _id: new Types.ObjectId(collectionId) });
    recipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId(recipeId) });

    await addRecipeToCollection(userId, collectionId, recipeId);
    const user = new Types.ObjectId(userId);
    const recipe = new Types.ObjectId(recipeId);
    const ownedCollection = new Types.ObjectId(collectionId);
    expect(updateSavedRecipeMock).toHaveBeenCalledWith(
      { user, recipe },
      {
        $setOnInsert: { user, recipe },
        $addToSet: { collections: ownedCollection },
      },
      { upsert: true },
    );
  });

  it('does not expose missing collections or private recipes when adding', async () => {
    collectionExistsMock.mockResolvedValue(null);
    recipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId(recipeId) });
    await expect(addRecipeToCollection(userId, collectionId, recipeId)).rejects.toMatchObject({
      code: 'COLLECTION_NOT_FOUND',
    });

    collectionExistsMock.mockResolvedValue({ _id: new Types.ObjectId(collectionId) });
    recipeExistsMock.mockResolvedValue(null);
    await expect(addRecipeToCollection(userId, collectionId, recipeId)).rejects.toMatchObject({
      code: 'RECIPE_NOT_FOUND',
    });
  });

  it('removes a recipe membership without removing its saved state', async () => {
    collectionExistsMock.mockResolvedValue({ _id: new Types.ObjectId(collectionId) });

    await removeRecipeFromCollection(userId, collectionId, recipeId);
    expect(updateSavedRecipeMock).toHaveBeenCalledWith(
      { user: new Types.ObjectId(userId), recipe: new Types.ObjectId(recipeId) },
      { $pull: { collections: new Types.ObjectId(collectionId) } },
    );
  });

  it('marks the collections that contain a saved recipe', async () => {
    aggregateMock.mockResolvedValue([
      collection,
      { ...collection, id: new Types.ObjectId().toString() },
    ]);
    savedRecipeSelectMock.mockResolvedValue({ collections: [new Types.ObjectId(collectionId)] });

    const memberships = await listRecipeCollectionMemberships(userId, recipeId);
    expect(memberships.map(({ id, containsRecipe }) => ({ id, containsRecipe }))).toEqual([
      { id: collectionId, containsRecipe: true },
      { id: expect.any(String), containsRecipe: false },
    ]);
  });
});
