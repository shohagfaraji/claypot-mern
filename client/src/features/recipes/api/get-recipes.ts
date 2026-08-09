import { apiRequest } from '@/lib/api-client';
import type { RecipeListItem } from '@/features/recipes/types';

interface GetRecipesResponse {
  data: {
    recipes: RecipeListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export async function getRecipes(signal?: AbortSignal) {
  const response = await apiRequest<GetRecipesResponse>('/recipes?limit=3&sort=newest', { signal });

  return response.data;
}
