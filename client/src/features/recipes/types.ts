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

export interface SavedRecipeListItem extends RecipeListItem {
  savedAt: string;
}

export interface SavedRecipeListData {
  recipes: SavedRecipeListItem[];
  pagination: RecipePagination;
}

export interface RecipeDetail extends RecipeListItem {
  ingredients: Array<{
    name: string;
    quantity: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  servings: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorRecipeListItem {
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
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorRecipeListData {
  recipes: AuthorRecipeListItem[];
  pagination: RecipePagination;
}

export interface CreateRecipeInput {
  title: string;
  summary: string;
  imageUrl?: string;
  ingredients: Array<{
    name: string;
    quantity: string;
  }>;
  instructions: Array<{
    description: string;
  }>;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  cuisine: string;
  category: string;
  tags: string[];
}

export interface AuthorRecipeDetail extends Omit<CreateRecipeInput, 'imageUrl' | 'instructions'> {
  id: string;
  author: string;
  slug: string;
  imageUrl: string | null;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
