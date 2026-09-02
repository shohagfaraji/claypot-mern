import type { RecipeListData } from '@/features/recipes/types';

export type CookConnectionType = 'followers' | 'following';

export interface CookConnection {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followedAt: string;
}

export interface CookConnectionListData {
  cooks: CookConnection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FollowingFeedData extends RecipeListData {
  followingCount: number;
}
