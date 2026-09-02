import type { RecipeListData } from '@/features/recipes/types';

export interface PublicUserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  publishedRecipeCount: number;
  followerCount: number;
  followingCount: number;
}

export type UserRecipeListData = RecipeListData;
