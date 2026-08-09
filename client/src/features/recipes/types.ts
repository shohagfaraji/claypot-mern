export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export interface RecipeListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  difficulty: RecipeDifficulty;
  cuisine: string;
  category: string;
  tags: string[];
  publishedAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface RecipePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RecipeListData {
  recipes: RecipeListItem[];
  pagination: RecipePagination;
}
