import type { SavedRecipeListItem, RecipePagination } from '@/features/recipes/types';

export interface RecipeCollection {
  id: string;
  name: string;
  description: string | null;
  recipeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCollectionMembership extends RecipeCollection {
  containsRecipe: boolean;
}

export interface RecipeCollectionInput {
  name: string;
  description: string | null;
}

export interface CollectionRecipeListData {
  collection: RecipeCollection;
  recipes: SavedRecipeListItem[];
  pagination: RecipePagination;
}
