import { describe, expect, it } from 'vitest';
import { recipeSlugParamsSchema } from '../../src/schemas/recipe.schema.js';

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
