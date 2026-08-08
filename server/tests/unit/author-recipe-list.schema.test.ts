import { describe, expect, it } from 'vitest';
import { listOwnRecipesQuerySchema } from '../../src/schemas/recipe.schema.js';

describe('author recipe listing query schema', () => {
  it('provides dashboard listing defaults', () => {
    expect(listOwnRecipesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 12,
      sort: 'updated',
    });
  });

  it('normalizes supported query parameters', () => {
    expect(
      listOwnRecipesQuerySchema.parse({
        page: '2',
        limit: '6',
        search: '  claypot rice  ',
        status: 'draft',
        sort: 'oldest',
      }),
    ).toEqual({
      page: 2,
      limit: 6,
      search: 'claypot rice',
      status: 'draft',
      sort: 'oldest',
    });
  });

  it.each([
    ['status', { status: 'archived' }],
    ['sort', { sort: 'quickest' }],
    ['unknown field', { author: 'another-user' }],
  ])('rejects an invalid %s', (_case, query) => {
    expect(listOwnRecipesQuerySchema.safeParse(query).success).toBe(false);
  });
});
