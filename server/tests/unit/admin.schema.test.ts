import { describe, expect, it } from 'vitest';
import { listAdminRecipesQuerySchema } from '../../src/schemas/admin.schema.js';

describe('admin recipe list query schema', () => {
  it('provides stable pagination and sorting defaults', () => {
    expect(listAdminRecipesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sort: 'newest',
    });
  });

  it('coerces pagination and normalizes filters', () => {
    expect(
      listAdminRecipesQuerySchema.parse({
        page: '2',
        limit: '25',
        search: '  claypot rice  ',
        status: 'draft',
        sort: 'updated',
      }),
    ).toEqual({
      page: 2,
      limit: 25,
      search: 'claypot rice',
      status: 'draft',
      sort: 'updated',
    });
  });

  it('rejects unsupported filters and excessive page sizes', () => {
    expect(listAdminRecipesQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
    expect(listAdminRecipesQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(listAdminRecipesQuerySchema.safeParse({ authorId: 'another-user' }).success).toBe(false);
  });
});
