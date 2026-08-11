import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateMock, deleteOneMock, recipeExistsMock, savedRecipeExistsMock, updateOneMock } =
  vi.hoisted(() => ({
    aggregateMock: vi.fn(),
    deleteOneMock: vi.fn(),
    recipeExistsMock: vi.fn(),
    savedRecipeExistsMock: vi.fn(),
    updateOneMock: vi.fn(),
  }));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    exists: recipeExistsMock,
  },
}));

vi.mock('../../src/models/saved-recipe.model.js', () => ({
  SavedRecipeModel: {
    aggregate: aggregateMock,
    deleteOne: deleteOneMock,
    exists: savedRecipeExistsMock,
    updateOne: updateOneMock,
  },
}));

import {
  isRecipeSaved,
  listSavedRecipes,
  saveRecipe,
  unsaveRecipe,
} from '../../src/services/saved-recipe.service.js';

const userId = '507f1f77bcf86cd799439011';
const recipeId = '507f1f77bcf86cd799439012';

describe('saved recipes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('idempotently saves a published recipe', async () => {
    recipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId(recipeId) });
    updateOneMock.mockResolvedValue({ acknowledged: true });

    await saveRecipe(userId, recipeId);

    const user = new Types.ObjectId(userId);
    const recipe = new Types.ObjectId(recipeId);
    expect(recipeExistsMock).toHaveBeenCalledWith({ _id: recipe, status: 'published' });
    expect(updateOneMock).toHaveBeenCalledWith(
      { user, recipe },
      { $setOnInsert: { user, recipe } },
      { upsert: true },
    );
  });

  it('does not save a missing or private recipe', async () => {
    recipeExistsMock.mockResolvedValue(null);

    await expect(saveRecipe(userId, recipeId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
    expect(updateOneMock).not.toHaveBeenCalled();
  });

  it('idempotently removes a saved recipe', async () => {
    deleteOneMock.mockResolvedValue({ deletedCount: 0 });

    await expect(unsaveRecipe(userId, recipeId)).resolves.toBeUndefined();
    expect(deleteOneMock).toHaveBeenCalledWith({
      user: new Types.ObjectId(userId),
      recipe: new Types.ObjectId(recipeId),
    });
  });

  it('checks whether a recipe is in the current user collection', async () => {
    savedRecipeExistsMock.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(isRecipeSaved(userId, recipeId)).resolves.toBe(true);
    expect(savedRecipeExistsMock).toHaveBeenCalledWith({
      user: new Types.ObjectId(userId),
      recipe: new Types.ObjectId(recipeId),
    });

    savedRecipeExistsMock.mockResolvedValue(null);
    await expect(isRecipeSaved(userId, recipeId)).resolves.toBe(false);
  });

  it('lists only published saved recipes with pagination', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ id: recipeId, title: 'Spiced Claypot Rice' }],
        metadata: [{ total: 10 }],
      },
    ]);

    const result = await listSavedRecipes(userId, {
      page: 2,
      limit: 9,
      search: 'rice.*',
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['comfort food'],
      sort: 'quickest',
    });

    expect(result).toEqual({
      items: [{ id: recipeId, title: 'Spiced Claypot Rice' }],
      pagination: { page: 2, limit: 9, total: 10, totalPages: 2 },
    });
    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: { user: new Types.ObjectId(userId) } });
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            'recipe.status': 'published',
            'recipe.difficulty': 'medium',
            'recipe.tags': { $all: ['comfort food'] },
          }),
        }),
        { $sort: { totalTimeMinutes: 1, createdAt: -1 } },
      ]),
    );
    const recipeMatch = pipeline.find(
      (stage) =>
        '$match' in stage &&
        typeof stage.$match === 'object' &&
        stage.$match !== null &&
        'recipe.status' in stage.$match,
    )?.$match as { $or: Array<Record<string, RegExp>> };
    expect(recipeMatch.$or[0]?.['recipe.title']?.source).toBe('rice\\.\\*');
  });

  it('returns an empty first page when no recipes are saved', async () => {
    aggregateMock.mockResolvedValue([]);

    await expect(
      listSavedRecipes(userId, {
        page: 1,
        limit: 12,
        tags: [],
        sort: 'saved',
      }),
    ).resolves.toEqual({
      items: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });
  });
});
