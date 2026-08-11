import { describe, expect, it } from 'vitest';
import { listSavedRecipesQuerySchema } from '../../src/schemas/recipe.schema.js';

describe('saved recipe list query schema', () => {
  it('applies collection defaults', () => {
    expect(listSavedRecipesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 12,
      sort: 'saved',
      tags: [],
    });
  });

  it('normalizes supported filters', () => {
    expect(
      listSavedRecipesQuerySchema.parse({
        page: '2',
        limit: '9',
        search: '  rice  ',
        difficulty: 'medium',
        cuisine: '  South Asian  ',
        category: '  Main course  ',
        tags: ' Rice,Comfort Food,rice ',
        sort: 'quickest',
      }),
    ).toEqual({
      page: 2,
      limit: 9,
      search: 'rice',
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
      sort: 'quickest',
    });
  });

  it('rejects unsupported sorting and excessive page sizes', () => {
    expect(listSavedRecipesQuerySchema.safeParse({ limit: 25, sort: 'oldest' }).success).toBe(
      false,
    );
  });
});
