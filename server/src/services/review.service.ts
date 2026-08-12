import { Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import type { AccessTokenIdentity } from '../lib/access-token.js';
import { RecipeModel } from '../models/recipe.model.js';
import { ReviewModel, type Review } from '../models/review.model.js';
import type {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
} from '../schemas/review.schema.js';

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface ReviewSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface PaginatedReviews {
  items: PublicReview[];
  summary: ReviewSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ReviewAggregation {
  items: PublicReview[];
  summary: Array<{ averageRating: number; reviewCount: number }>;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function getReviewSort(sort: ListReviewsQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListReviewsQuery['sort'], Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
  };

  return sorts[sort];
}

function toOwnedReview(review: Review & { id: string }, user: PublicReview['user']): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user,
  };
}

export async function createReview(
  recipeId: string,
  actor: AccessTokenIdentity,
  input: CreateReviewInput,
): Promise<PublicReview> {
  const recipe = await RecipeModel.findOne({
    _id: new Types.ObjectId(recipeId),
    status: 'published',
  }).select('author');

  if (recipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  if (recipe.author.toString() === actor.userId) {
    throw new AppError(403, 'OWN_RECIPE_REVIEW', 'You cannot review your own recipe.');
  }

  try {
    const review = await ReviewModel.create({
      recipe: new Types.ObjectId(recipeId),
      user: new Types.ObjectId(actor.userId),
      rating: input.rating,
      comment: input.comment,
    });
    const user = await review.populate<{ user: PublicReview['user'] }>({
      path: 'user',
      select: 'name username avatarUrl',
    });

    return toOwnedReview(review, {
      id: user.user.id,
      name: user.user.name,
      username: user.user.username,
      avatarUrl: user.user.avatarUrl,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'REVIEW_ALREADY_EXISTS', 'You have already reviewed this recipe.', {
        cause: error,
      });
    }

    throw error;
  }
}

export async function listReviews(
  recipeId: string,
  query: ListReviewsQuery,
): Promise<PaginatedReviews> {
  const publishedRecipeExists = await RecipeModel.exists({
    _id: new Types.ObjectId(recipeId),
    status: 'published',
  });

  if (publishedRecipeExists === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: { recipe: new Types.ObjectId(recipeId) } },
    {
      $facet: {
        items: [
          { $sort: getReviewSort(query.sort) },
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'userProfile',
            },
          },
          { $unwind: '$userProfile' },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              rating: 1,
              comment: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                id: { $toString: '$userProfile._id' },
                name: '$userProfile.name',
                username: '$userProfile.username',
                avatarUrl: '$userProfile.avatarUrl',
              },
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
          {
            $project: { _id: 0, averageRating: { $round: ['$averageRating', 1] }, reviewCount: 1 },
          },
        ],
      },
    },
  ];
  const [result] = await ReviewModel.aggregate<ReviewAggregation>(pipeline);
  const items = result?.items ?? [];
  const summary = result?.summary[0] ?? { averageRating: null, reviewCount: 0 };

  return {
    items,
    summary,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: summary.reviewCount,
      totalPages: Math.ceil(summary.reviewCount / query.limit),
    },
  };
}

export async function getCurrentUserReview(
  recipeId: string,
  userId: string,
): Promise<PublicReview | null> {
  const publishedRecipeExists = await RecipeModel.exists({
    _id: new Types.ObjectId(recipeId),
    status: 'published',
  });

  if (publishedRecipeExists === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  const review = await ReviewModel.findOne({
    recipe: new Types.ObjectId(recipeId),
    user: new Types.ObjectId(userId),
  });

  if (review === null) return null;

  const populatedReview = await review.populate<{ user: PublicReview['user'] }>({
    path: 'user',
    select: 'name username avatarUrl',
  });

  return toOwnedReview(review, {
    id: populatedReview.user.id,
    name: populatedReview.user.name,
    username: populatedReview.user.username,
    avatarUrl: populatedReview.user.avatarUrl,
  });
}

export async function updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewInput,
): Promise<PublicReview> {
  const review = await ReviewModel.findOne({
    _id: new Types.ObjectId(reviewId),
    user: new Types.ObjectId(userId),
  });

  if (review === null) {
    throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review was not found.');
  }

  if (input.rating !== undefined) review.rating = input.rating;
  if (input.comment !== undefined) review.comment = input.comment;
  await review.save();
  const populatedReview = await review.populate<{ user: PublicReview['user'] }>({
    path: 'user',
    select: 'name username avatarUrl',
  });

  return toOwnedReview(review, {
    id: populatedReview.user.id,
    name: populatedReview.user.name,
    username: populatedReview.user.username,
    avatarUrl: populatedReview.user.avatarUrl,
  });
}

export async function deleteReview(reviewId: string, actor: AccessTokenIdentity): Promise<void> {
  const filter: Record<string, unknown> = { _id: new Types.ObjectId(reviewId) };
  if (actor.role !== 'admin') filter.user = new Types.ObjectId(actor.userId);

  const review = await ReviewModel.findOneAndDelete(filter);

  if (review === null) {
    throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review was not found.');
  }
}
