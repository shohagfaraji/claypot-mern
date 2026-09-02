import { describe, expect, it } from 'vitest';
import {
  followUserIdParamsSchema,
  listCookConnectionsQuerySchema,
} from '../../src/schemas/follow.schema.js';

describe('follow schemas', () => {
  it('normalizes valid cook identifiers', () => {
    expect(followUserIdParamsSchema.parse({ userId: ' 507F1F77BCF86CD799439011 ' })).toEqual({
      userId: '507f1f77bcf86cd799439011',
    });
  });

  it('applies connection list defaults', () => {
    expect(listCookConnectionsQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
  });

  it('rejects invalid identifiers and pagination', () => {
    expect(followUserIdParamsSchema.safeParse({ userId: 'invalid' }).success).toBe(false);
    expect(listCookConnectionsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listCookConnectionsQuerySchema.safeParse({ limit: 31 }).success).toBe(false);
    expect(listCookConnectionsQuerySchema.safeParse({ sort: 'oldest' }).success).toBe(false);
  });
});
