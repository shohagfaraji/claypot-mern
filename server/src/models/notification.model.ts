import { model, Schema, type Types } from 'mongoose';

export const notificationTypes = ['review_created', 'report_resolved', 'report_dismissed'] as const;

export interface Notification {
  recipient: Types.ObjectId;
  actor: Types.ObjectId | null;
  type: (typeof notificationTypes)[number];
  recipe: Types.ObjectId;
  review: Types.ObjectId | null;
  report: Types.ObjectId | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: notificationTypes, required: true },
    recipe: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
    review: { type: Schema.Types.ObjectId, ref: 'Review', default: null },
    report: { type: Schema.Types.ObjectId, ref: 'ContentReport', default: null },
    readAt: { type: Date, default: null },
  },
  {
    collection: 'notifications',
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.pre('validate', function validateNotificationTarget() {
  if (this.type === 'review_created') {
    if (this.actor === null) this.invalidate('actor', 'Review notifications require an actor.');
    if (this.review === null) this.invalidate('review', 'Review notifications require a review.');
    return;
  }

  if (this.report === null) this.invalidate('report', 'Report notifications require a report.');
});

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipe: 1 });
notificationSchema.index({ review: 1 }, { sparse: true });

export const NotificationModel = model<Notification>('Notification', notificationSchema);
