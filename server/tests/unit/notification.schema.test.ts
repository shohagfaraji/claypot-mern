import { describe, expect, it } from 'vitest';
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
} from '../../src/schemas/notification.schema.js';

describe('notification schemas', () => {
  it('applies inbox pagination defaults', () => {
    expect(listNotificationsQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
  });

  it('accepts the unread filter and supported page sizes', () => {
    expect(
      listNotificationsQuerySchema.parse({ page: '2', limit: '20', status: 'unread' }),
    ).toEqual({ page: 2, limit: 20, status: 'unread' });
  });

  it('rejects unknown filters, excessive limits, and invalid identifiers', () => {
    expect(listNotificationsQuerySchema.safeParse({ status: 'read' }).success).toBe(false);
    expect(listNotificationsQuerySchema.safeParse({ limit: 31 }).success).toBe(false);
    expect(listNotificationsQuerySchema.safeParse({ sort: 'oldest' }).success).toBe(false);
    expect(notificationIdParamsSchema.safeParse({ notificationId: 'invalid' }).success).toBe(false);
  });

  it('normalizes notification identifiers', () => {
    expect(
      notificationIdParamsSchema.parse({ notificationId: ' 507F1F77BCF86CD799439011 ' }),
    ).toEqual({ notificationId: '507f1f77bcf86cd799439011' });
  });
});
