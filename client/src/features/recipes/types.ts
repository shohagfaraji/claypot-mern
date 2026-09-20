export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export const pairingLabels = ['Side dish', 'Sauce', 'Drink', 'Dessert', 'Related recipe'] as const;
export interface RecipePairing {
  recipeId: string;
  label: (typeof pairingLabels)[number];
}
export interface PairedRecipe {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  category: string;
  totalTimeMinutes: number;
  label: RecipePairing['label'];
}

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
  averageRating: number;
  reviewCount: number;
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

export interface RecipeDetail extends Omit<RecipeListItem, 'averageRating' | 'reviewCount'> {
  pairedRecipes?: PairedRecipe[];
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
  pairings?: RecipePairing[];
  title: string;
  summary: string;
  imageUrl?: string;
  imagePublicId?: string;
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

export interface AuthorRecipeDetail
  extends Omit<CreateRecipeInput, 'imageUrl' | 'imagePublicId' | 'instructions'> {
  id: string;
  pairedRecipes?: PairedRecipe[];
  author: string;
  slug: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
