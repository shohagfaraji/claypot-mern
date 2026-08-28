import { describe, expect, it } from 'vitest';
import {
  contentReportIdParamsSchema,
  createContentReportInputSchema,
  listContentReportsQuerySchema,
  reviewContentReportInputSchema,
} from '../../src/schemas/report.schema.js';

const targetId = '507f1f77bcf86cd799439012';

describe('content report schemas', () => {
  it('normalizes a valid report submission', () => {
    expect(
      createContentReportInputSchema.parse({
        targetType: 'recipe',
        targetId: targetId.toUpperCase(),
        reason: 'misleading',
        details: '  The preparation details do not match the ingredients.  ',
      }),
    ).toEqual({
      targetType: 'recipe',
      targetId,
      reason: 'misleading',
      details: 'The preparation details do not match the ingredients.',
    });
  });

  it('requires details for another reason and rejects unexpected fields', () => {
    expect(
      createContentReportInputSchema.safeParse({
        targetType: 'review',
        targetId,
        reason: 'other',
      }).success,
    ).toBe(false);
    expect(
      createContentReportInputSchema.safeParse({
        targetType: 'review',
        targetId,
        reason: 'spam',
        status: 'resolved',
      }).success,
    ).toBe(false);
  });

  it('validates moderation filters and report decisions', () => {
    expect(listContentReportsQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sort: 'newest',
    });
    expect(
      listContentReportsQuerySchema.parse({
        page: '2',
        status: 'open',
        targetType: 'review',
        reason: 'spam',
        sort: 'oldest',
      }),
    ).toEqual({
      page: 2,
      limit: 10,
      status: 'open',
      targetType: 'review',
      reason: 'spam',
      sort: 'oldest',
    });
    expect(
      reviewContentReportInputSchema.parse({
        status: 'dismissed',
        note: '  The reported content does not violate community rules.  ',
      }),
    ).toEqual({
      status: 'dismissed',
      note: 'The reported content does not violate community rules.',
    });
    expect(contentReportIdParamsSchema.safeParse({ reportId: 'invalid' }).success).toBe(false);
  });
});
