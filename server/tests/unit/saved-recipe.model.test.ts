import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { SavedRecipeModel } from '../../src/models/saved-recipe.model.js';

describe('Saved recipe model', () => {
  it('accepts a user and recipe reference', async () => {
    const savedRecipe = new SavedRecipeModel({
      user: new Types.ObjectId(),
      recipe: new Types.ObjectId(),
    });

    await expect(savedRecipe.validate()).resolves.toBeUndefined();
    expect(savedRecipe.collections).toEqual([]);
  });

  it('requires both references', async () => {
    const savedRecipe = new SavedRecipeModel({});

    await expect(savedRecipe.validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        recipe: expect.any(Object),
      },
    });
  });

  it('prevents duplicate saves and supports recent-first user queries', () => {
    expect(SavedRecipeModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ user: 1, recipe: 1 }, expect.objectContaining({ unique: true })],
        [{ user: 1, createdAt: -1 }, expect.any(Object)],
        [{ user: 1, collections: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
