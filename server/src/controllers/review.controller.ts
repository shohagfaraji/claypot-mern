import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { RecipeIdParams } from '../schemas/recipe.schema.js';
import type {
  CreateReviewInput,
  ListReviewsQuery,
  ReviewIdParams,
  UpdateReviewInput,
} from '../schemas/review.schema.js';
import {
  createReview,
  deleteReview,
  getCurrentUserReview,
  listReviews,
  updateReview,
} from '../services/review.service.js';

export const list: RequestHandler = async (request, response) => {
  const { recipeId } = request.validatedParams as RecipeIdParams;
  const result = await listReviews(recipeId, request.validatedQuery as ListReviewsQuery);

  response.status(200).json({
    data: {
      reviews: result.items,
      summary: result.summary,
      pagination: result.pagination,
    },
  });
};

export const create: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  const review = await createReview(recipeId, request.auth, request.body as CreateReviewInput);

  response.status(201).json({ data: { review } });
};

export const mine: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { recipeId } = request.validatedParams as RecipeIdParams;
  const review = await getCurrentUserReview(recipeId, request.auth.userId);

  response.status(200).json({ data: { review } });
};

export const update: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { reviewId } = request.validatedParams as ReviewIdParams;
  const review = await updateReview(
    reviewId,
    request.auth.userId,
    request.body as UpdateReviewInput,
  );

  response.status(200).json({ data: { review } });
};

export const remove: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { reviewId } = request.validatedParams as ReviewIdParams;
  await deleteReview(reviewId, request.auth);

  response.status(204).send();
};
