import type { RecipeReview, ReviewInput, ReviewListData } from '@/features/reviews/types';
import { apiRequest } from '@/lib/api-client';

interface ReviewResponse {
  data: {
    review: RecipeReview;
  };
}

interface CurrentUserReviewResponse {
  data: {
    review: RecipeReview | null;
  };
}

interface ReviewListResponse {
  data: ReviewListData;
}

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export async function getReviews(recipeId: string, queryString: string, signal?: AbortSignal) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await apiRequest<ReviewListResponse>(`/recipes/${recipeId}/reviews${query}`, {
    signal,
  });

  return response.data;
}

export async function getCurrentUserReview(
  request: AuthenticatedRequest,
  recipeId: string,
  signal?: AbortSignal,
) {
  const response = await request<CurrentUserReviewResponse>(`/recipes/${recipeId}/reviews/mine`, {
    signal,
  });

  return response.data.review;
}

export async function createReview(
  request: AuthenticatedRequest,
  recipeId: string,
  input: ReviewInput,
) {
  const response = await request<ReviewResponse>(`/recipes/${recipeId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.review;
}

export async function updateReview(
  request: AuthenticatedRequest,
  reviewId: string,
  input: ReviewInput,
) {
  const response = await request<ReviewResponse>(`/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.review;
}

export async function deleteReview(request: AuthenticatedRequest, reviewId: string) {
  await request(`/reviews/${reviewId}`, { method: 'DELETE' });
}
