import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { NotificationModel } from '../../src/models/notification.model.js';

describe('Notification model', () => {
  it('accepts review and report activity with unread defaults', async () => {
    const reviewNotification = new NotificationModel({
      recipient: new Types.ObjectId(),
      actor: new Types.ObjectId(),
      type: 'review_created',
      recipe: new Types.ObjectId(),
      review: new Types.ObjectId(),
    });
    const reportNotification = new NotificationModel({
      recipient: new Types.ObjectId(),
      type: 'report_resolved',
      recipe: new Types.ObjectId(),
      report: new Types.ObjectId(),
    });

    await expect(reviewNotification.validate()).resolves.toBeUndefined();
    await expect(reportNotification.validate()).resolves.toBeUndefined();
    expect(reviewNotification.readAt).toBeNull();
    expect(reportNotification.actor).toBeNull();
  });

  it('requires the shared recipient, type, and recipe fields', async () => {
    await expect(new NotificationModel({}).validate()).rejects.toMatchObject({
      errors: {
        recipient: expect.any(Object),
        type: expect.any(Object),
        recipe: expect.any(Object),
      },
    });
  });

  it('requires the source fields used by each notification type', async () => {
    const reviewNotification = new NotificationModel({
      recipient: new Types.ObjectId(),
      type: 'review_created',
      recipe: new Types.ObjectId(),
    });
    const reportNotification = new NotificationModel({
      recipient: new Types.ObjectId(),
      type: 'report_dismissed',
      recipe: new Types.ObjectId(),
    });

    await expect(reviewNotification.validate()).rejects.toMatchObject({
      errors: { actor: expect.any(Object), review: expect.any(Object) },
    });
    await expect(reportNotification.validate()).rejects.toMatchObject({
      errors: { report: expect.any(Object) },
    });
  });

  it('indexes recipient inbox and unread queries', () => {
    expect(NotificationModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ recipient: 1, readAt: 1, createdAt: -1 }, expect.any(Object)],
        [{ recipient: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });
});
