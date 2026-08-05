import { describe, expect, it } from 'vitest';
import { listRecipesQuerySchema } from '../../src/schemas/recipe.schema.js';

describe('recipe listing query schema', () => {
  it('provides stable pagination and sorting defaults', () => {
    expect(listRecipesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 12,
      tags: [],
      sort: 'newest',
    });
  });

  it('coerces and normalizes supported query parameters', () => {
    expect(
      listRecipesQuerySchema.parse({
        page: '2',
        limit: '6',
        search: '  claypot rice  ',
        difficulty: 'medium',
        cuisine: '  South Asian  ',
        category: '  Main course  ',
        tags: ' Rice, Comfort Food,rice ',
        sort: 'quickest',
      }),
    ).toEqual({
      page: 2,
      limit: 6,
      search: 'claypot rice',
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
      sort: 'quickest',
    });
  });

  it('accepts repeated tag query parameters', () => {
    expect(
      listRecipesQuerySchema.parse({
        tags: ['rice', 'quick,dinner'],
      }).tags,
    ).toEqual(['rice', 'quick', 'dinner']);
  });

  it.each([
    ['page', { page: '0' }],
    ['limit', { limit: '25' }],
    ['difficulty', { difficulty: 'expert' }],
    ['sort', { sort: 'popular' }],
    ['unknown field', { author: 'user-id' }],
  ])('rejects an invalid %s', (_case, query) => {
    expect(listRecipesQuerySchema.safeParse(query).success).toBe(false);
  });
});
