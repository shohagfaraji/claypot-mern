import { describe, expect, it } from 'vitest';
import {
  collectionRecipeParamsSchema,
  recipeCollectionIdParamsSchema,
  recipeCollectionInputSchema,
} from '../../src/schemas/recipe-collection.schema.js';

describe('recipe collection schemas', () => {
  it('normalizes collection details', () => {
    expect(
      recipeCollectionInputSchema.parse({
        name: '  Weeknight   dinners  ',
        description: '  Reliable   meals for busy evenings.  ',
      }),
    ).toEqual({
      name: 'Weeknight dinners',
      description: 'Reliable meals for busy evenings.',
    });
    expect(recipeCollectionInputSchema.parse({ name: 'Favorites' })).toEqual({
      name: 'Favorites',
      description: null,
    });
    expect(recipeCollectionInputSchema.parse({ name: 'Celebrations', description: null })).toEqual({
      name: 'Celebrations',
      description: null,
    });
  });

  it('normalizes collection and recipe identifiers', () => {
    expect(
      collectionRecipeParamsSchema.parse({
        collectionId: ' 507F1F77BCF86CD799439011 ',
        recipeId: ' 507F1F77BCF86CD799439012 ',
      }),
    ).toEqual({
      collectionId: '507f1f77bcf86cd799439011',
      recipeId: '507f1f77bcf86cd799439012',
    });
  });

  it('rejects invalid details and identifiers', () => {
    expect(recipeCollectionInputSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(
      recipeCollectionInputSchema.safeParse({ name: 'a'.repeat(61), description: '' }).success,
    ).toBe(false);
    expect(
      recipeCollectionInputSchema.safeParse({
        name: 'Favorites',
        description: 'a'.repeat(241),
      }).success,
    ).toBe(false);
    expect(recipeCollectionIdParamsSchema.safeParse({ collectionId: 'invalid' }).success).toBe(
      false,
    );
  });
});
