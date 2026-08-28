import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { ContentReportModel } from '../../src/models/content-report.model.js';

function createValidReport() {
  return new ContentReportModel({
    reporter: new Types.ObjectId(),
    targetAuthor: new Types.ObjectId(),
    targetType: 'review',
    recipe: new Types.ObjectId(),
    review: new Types.ObjectId(),
    reason: 'inappropriate',
    details: '  This review contains content that should be checked.  ',
  });
}

describe('Content report model', () => {
  it('accepts and normalizes a complete report', async () => {
    const report = createValidReport();

    await expect(report.validate()).resolves.toBeUndefined();
    expect(report.details).toBe('This review contains content that should be checked.');
    expect(report.status).toBe('open');
    expect(report.reviewedAt).toBeNull();
  });

  it('requires reporter, target, and reason fields', async () => {
    await expect(new ContentReportModel({}).validate()).rejects.toMatchObject({
      errors: {
        reporter: expect.any(Object),
        targetAuthor: expect.any(Object),
        targetType: expect.any(Object),
        recipe: expect.any(Object),
        reason: expect.any(Object),
      },
    });
  });

  it('rejects unsupported values and invalid note lengths', async () => {
    const report = createValidReport();
    report.targetType = 'unsupported' as 'review';
    report.reason = 'unsupported' as 'spam';
    report.details = 'Short';

    await expect(report.validate()).rejects.toMatchObject({
      errors: {
        targetType: expect.any(Object),
        reason: expect.any(Object),
        details: expect.any(Object),
      },
    });
  });

  it('prevents duplicate open reports and supports moderation queries', () => {
    expect(ContentReportModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { reporter: 1, targetType: 1, recipe: 1, review: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { status: 'open' },
          }),
        ],
        [{ status: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
