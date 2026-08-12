import type { RecipePagination } from '@/features/recipes/types';

export interface RecipeReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
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

export interface ReviewListData {
  reviews: RecipeReview[];
  summary: ReviewSummary;
  pagination: RecipePagination;
}

export interface ReviewInput {
  rating: number;
  comment: string;
}

export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';
