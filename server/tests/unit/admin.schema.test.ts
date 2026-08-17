import { describe, expect, it } from 'vitest';
import {
  adminUserIdParamsSchema,
  listAdminRecipesQuerySchema,
  listAdminUsersQuerySchema,
  updateAdminUserRoleInputSchema,
} from '../../src/schemas/admin.schema.js';

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

describe('admin user list query schema', () => {
  it('provides stable pagination and sorting defaults', () => {
    expect(listAdminUsersQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sort: 'newest',
    });
  });

  it('coerces pagination and normalizes directory filters', () => {
    expect(
      listAdminUsersQuerySchema.parse({
        page: '2',
        limit: '20',
        search: '  amina  ',
        role: 'user',
        verification: 'verified',
        sort: 'recent-login',
      }),
    ).toEqual({
      page: 2,
      limit: 20,
      search: 'amina',
      role: 'user',
      verification: 'verified',
      sort: 'recent-login',
    });
  });

  it('rejects unsupported user filters and server-controlled fields', () => {
    expect(listAdminUsersQuerySchema.safeParse({ role: 'owner' }).success).toBe(false);
    expect(listAdminUsersQuerySchema.safeParse({ verification: 'pending' }).success).toBe(false);
    expect(listAdminUsersQuerySchema.safeParse({ passwordHash: 'value' }).success).toBe(false);
  });
});

describe('admin user role schemas', () => {
  it('accepts managed roles for a valid user identifier', () => {
    expect(adminUserIdParamsSchema.parse({ userId: '507F1F77BCF86CD799439011' })).toEqual({
      userId: '507f1f77bcf86cd799439011',
    });
    expect(updateAdminUserRoleInputSchema.parse({ role: 'admin' })).toEqual({ role: 'admin' });
  });

  it('rejects malformed identifiers, roles, and unknown fields', () => {
    expect(adminUserIdParamsSchema.safeParse({ userId: 'invalid-id' }).success).toBe(false);
    expect(updateAdminUserRoleInputSchema.safeParse({ role: 'owner' }).success).toBe(false);
    expect(
      updateAdminUserRoleInputSchema.safeParse({ role: 'admin', userId: 'another-user' }).success,
    ).toBe(false);
  });
});
