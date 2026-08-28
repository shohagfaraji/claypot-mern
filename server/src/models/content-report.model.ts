import { model, Schema, type Types } from 'mongoose';

export const contentReportTargetTypes = ['recipe', 'review'] as const;
export const contentReportReasons = [
  'spam',
  'harassment',
  'inappropriate',
  'misleading',
  'other',
] as const;
export const contentReportStatuses = ['open', 'resolved', 'dismissed'] as const;

export interface ContentReport {
  reporter: Types.ObjectId;
  targetAuthor: Types.ObjectId;
  targetType: (typeof contentReportTargetTypes)[number];
  recipe: Types.ObjectId;
  review: Types.ObjectId | null;
  reason: (typeof contentReportReasons)[number];
  details: string | null;
  status: (typeof contentReportStatuses)[number];
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const contentReportSchema = new Schema<ContentReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetAuthor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: contentReportTargetTypes, required: true },
    recipe: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
    review: { type: Schema.Types.ObjectId, ref: 'Review', default: null },
    reason: { type: String, enum: contentReportReasons, required: true },
    details: { type: String, trim: true, minlength: 10, maxlength: 500, default: null },
    status: { type: String, enum: contentReportStatuses, default: 'open' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, minlength: 10, maxlength: 500, default: null },
  },
  {
    collection: 'content_reports',
    timestamps: true,
    versionKey: false,
  },
);

contentReportSchema.index(
  { reporter: 1, targetType: 1, recipe: 1, review: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } },
);
contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ targetAuthor: 1, status: 1 });

export const ContentReportModel = model<ContentReport>('ContentReport', contentReportSchema);
