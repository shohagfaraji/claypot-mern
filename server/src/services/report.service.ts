import { startSession, Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { ContentReportModel } from '../models/content-report.model.js';
import { RecipeModel } from '../models/recipe.model.js';
import { ReviewModel } from '../models/review.model.js';
import type {
  CreateContentReportInput,
  ListContentReportsQuery,
  ReviewContentReportInput,
} from '../schemas/report.schema.js';
import { createReportNotification } from './notification.service.js';

export interface CreatedContentReport {
  id: string;
  status: 'open';
  createdAt: Date;
}

export interface AdminContentReportItem {
  id: string;
  targetType: 'recipe' | 'review';
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misleading' | 'other';
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolutionNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  reporter: { id: string; name: string; username: string };
  target: {
    id: string;
    recipe: { id: string; title: string; slug: string };
    review: { rating: number; comment: string } | null;
    author: { id: string; name: string; username: string };
  };
}

export interface PaginatedContentReports {
  items: AdminContentReportItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ReviewedContentReport {
  id: string;
  status: 'resolved' | 'dismissed';
  resolutionNote: string;
  reviewedAt: Date;
}

interface ReportAggregation {
  items: AdminContentReportItem[];
  metadata: Array<{ total: number }>;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function reportTargetNotFound(): AppError {
  return new AppError(404, 'REPORT_TARGET_NOT_FOUND', 'The content could not be found.');
}

export async function createContentReport(
  reporterId: string,
  input: CreateContentReportInput,
): Promise<CreatedContentReport> {
  const reporter = new Types.ObjectId(reporterId);
  const targetId = new Types.ObjectId(input.targetId);
  let recipe: Types.ObjectId;
  let review: Types.ObjectId | null = null;
  let targetAuthor: Types.ObjectId;

  if (input.targetType === 'recipe') {
    const targetRecipe = await RecipeModel.findOne({ _id: targetId, status: 'published' }).select(
      'author',
    );

    if (targetRecipe === null) throw reportTargetNotFound();
    recipe = targetRecipe._id;
    targetAuthor = targetRecipe.author;
  } else {
    const targetReview = await ReviewModel.findById(targetId).select('recipe user');

    if (targetReview === null) throw reportTargetNotFound();
    const publishedRecipeExists = await RecipeModel.exists({
      _id: targetReview.recipe,
      status: 'published',
    });
    if (publishedRecipeExists === null) throw reportTargetNotFound();

    recipe = targetReview.recipe;
    review = targetReview._id;
    targetAuthor = targetReview.user;
  }

  if (targetAuthor.equals(reporter)) {
    throw new AppError(403, 'OWN_CONTENT_REPORT', 'You cannot report your own content.');
  }

  try {
    const report = await ContentReportModel.create({
      reporter,
      targetAuthor,
      targetType: input.targetType,
      recipe,
      review,
      reason: input.reason,
      details: input.details ?? null,
    });

    return { id: report.id, status: 'open', createdAt: report.createdAt };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        409,
        'REPORT_ALREADY_EXISTS',
        'You already have an open report for this content.',
        { cause: error },
      );
    }

    throw error;
  }
}

function getReportSort(sort: ListContentReportsQuery['sort']): Record<string, 1 | -1> {
  return sort === 'oldest' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
}

export async function listContentReports(
  query: ListContentReportsQuery,
): Promise<PaginatedContentReports> {
  const match: Record<string, unknown> = {};
  if (query.status !== undefined) match.status = query.status;
  if (query.targetType !== undefined) match.targetType = query.targetType;
  if (query.reason !== undefined) match.reason = query.reason;

  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: getReportSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: { from: 'users', localField: 'reporter', foreignField: '_id', as: 'reporter' },
          },
          { $unwind: '$reporter' },
          {
            $lookup: {
              from: 'users',
              localField: 'targetAuthor',
              foreignField: '_id',
              as: 'targetAuthor',
            },
          },
          { $unwind: '$targetAuthor' },
          { $lookup: { from: 'recipes', localField: 'recipe', foreignField: '_id', as: 'recipe' } },
          { $unwind: '$recipe' },
          { $lookup: { from: 'reviews', localField: 'review', foreignField: '_id', as: 'review' } },
          { $unwind: { path: '$review', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              targetType: 1,
              reason: 1,
              details: 1,
              status: 1,
              resolutionNote: 1,
              reviewedAt: 1,
              createdAt: 1,
              reporter: {
                id: { $toString: '$reporter._id' },
                name: '$reporter.name',
                username: '$reporter.username',
              },
              target: {
                id: {
                  $toString: {
                    $cond: [{ $eq: ['$targetType', 'review'] }, '$review._id', '$recipe._id'],
                  },
                },
                recipe: {
                  id: { $toString: '$recipe._id' },
                  title: '$recipe.title',
                  slug: '$recipe.slug',
                },
                review: {
                  $cond: [
                    { $eq: ['$targetType', 'review'] },
                    { rating: '$review.rating', comment: '$review.comment' },
                    null,
                  ],
                },
                author: {
                  id: { $toString: '$targetAuthor._id' },
                  name: '$targetAuthor.name',
                  username: '$targetAuthor.username',
                },
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];
  const [result] = await ContentReportModel.aggregate<ReportAggregation>(pipeline);
  const items = result?.items ?? [];
  const total = result?.metadata[0]?.total ?? 0;

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function reviewContentReport(
  reportId: string,
  reviewerId: string,
  input: ReviewContentReportInput,
): Promise<ReviewedContentReport> {
  const reviewedAt = new Date();
  const reportObjectId = new Types.ObjectId(reportId);
  const session = await startSession();

  try {
    const report = await session.withTransaction(async () => {
      const reviewedReport = await ContentReportModel.findOneAndUpdate(
        { _id: reportObjectId, status: 'open' },
        {
          $set: {
            status: input.status,
            resolutionNote: input.note,
            reviewedBy: new Types.ObjectId(reviewerId),
            reviewedAt,
          },
        },
        { returnDocument: 'after', session },
      );

      if (reviewedReport === null) {
        const reportExists = await ContentReportModel.exists({ _id: reportObjectId }).session(
          session,
        );
        if (reportExists === null) {
          throw new AppError(404, 'REPORT_NOT_FOUND', 'The report could not be found.');
        }

        throw new AppError(
          409,
          'REPORT_ALREADY_REVIEWED',
          'This report has already been reviewed.',
        );
      }

      await createReportNotification({
        recipientId: reviewedReport.reporter,
        recipeId: reviewedReport.recipe,
        reviewId: reviewedReport.review,
        reportId: reviewedReport._id,
        status: input.status,
        session,
      });
      return reviewedReport;
    });

    if (report === undefined) throw new Error('Report review did not complete.');

    return {
      id: report.id,
      status: report.status as ReviewedContentReport['status'],
      resolutionNote: report.resolutionNote as string,
      reviewedAt: report.reviewedAt as Date,
    };
  } finally {
    await session.endSession();
  }
}
