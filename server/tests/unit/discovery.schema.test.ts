import { describe, expect, it } from 'vitest';
import { listCooksQuerySchema } from '../../src/schemas/discovery.schema.js';

describe('cook discovery query schema', () => {
  it('provides stable pagination and ranking defaults', () => {
    expect(listCooksQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 12,
      sort: 'popular',
    });
  });

  it('coerces and normalizes supported query parameters', () => {
    expect(
      listCooksQuerySchema.parse({
        page: '2',
        limit: '6',
        search: '  claypot cook  ',
        sort: 'name',
      }),
    ).toEqual({
      page: 2,
      limit: 6,
      search: 'claypot cook',
      sort: 'name',
    });
  });

  it.each([
    ['page', { page: '0' }],
    ['limit', { limit: '25' }],
    ['search', { search: 'a'.repeat(81) }],
    ['sort', { sort: 'most-recipes' }],
    ['unknown field', { role: 'admin' }],
  ])('rejects an invalid %s', (_case, query) => {
    expect(listCooksQuerySchema.safeParse(query).success).toBe(false);
  });

  it('ignores an empty search value', () => {
    expect(listCooksQuerySchema.parse({ search: '   ' })).toEqual({
      page: 1,
      limit: 12,
      sort: 'popular',
    });
  });
});
