import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { RecipeCollectionModel } from '../../src/models/recipe-collection.model.js';

describe('Recipe collection model', () => {
  it('accepts an owned recipe collection', async () => {
    const collection = new RecipeCollectionModel({
      user: new Types.ObjectId(),
      name: 'Weeknight dinners',
      normalizedName: 'weeknight dinners',
      description: 'Reliable meals for busy evenings.',
    });

    await expect(collection.validate()).resolves.toBeUndefined();
  });

  it('requires ownership and collection names', async () => {
    await expect(new RecipeCollectionModel({}).validate()).rejects.toMatchObject({
      errors: {
        user: expect.any(Object),
        name: expect.any(Object),
        normalizedName: expect.any(Object),
      },
    });
  });

  it('prevents duplicate names per user and supports recent-first lists', () => {
    expect(RecipeCollectionModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ user: 1, normalizedName: 1 }, expect.objectContaining({ unique: true })],
        [{ user: 1, updatedAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
