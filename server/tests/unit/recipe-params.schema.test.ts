import { describe, expect, it } from 'vitest';
import { recipeIdParamsSchema, recipeSlugParamsSchema } from '../../src/schemas/recipe.schema.js';

describe('recipe slug parameters', () => {
  it('normalizes a valid slug', () => {
    expect(recipeSlugParamsSchema.parse({ slug: '  Spiced-Claypot-Rice  ' })).toEqual({
      slug: 'spiced-claypot-rice',
    });
  });

  it.each(['invalid_slug', '-invalid-slug', 'invalid-slug-', 'invalid--slug'])(
    'rejects %s',
    (slug) => {
      expect(recipeSlugParamsSchema.safeParse({ slug }).success).toBe(false);
    },
  );
});

describe('recipe ID parameters', () => {
  it('normalizes a valid MongoDB ObjectId', () => {
    expect(
      recipeIdParamsSchema.parse({
        recipeId: '507F1F77BCF86CD799439012',
      }),
    ).toEqual({
      recipeId: '507f1f77bcf86cd799439012',
    });
  });

  it.each(['invalid-id', '507f1f77bcf86cd79943901', '507f1f77bcf86cd79943901g'])(
    'rejects %s',
    (recipeId) => {
      expect(recipeIdParamsSchema.safeParse({ recipeId }).success).toBe(false);
    },
  );
});
