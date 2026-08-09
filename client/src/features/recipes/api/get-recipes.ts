import { apiRequest } from '@/lib/api-client';
import type { RecipeListData } from '@/features/recipes/types';

interface GetRecipesResponse {
  data: {
    recipes: RecipeListData['recipes'];
    pagination: RecipeListData['pagination'];
  };
}

export async function getRecipes(queryString: string, signal?: AbortSignal) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await apiRequest<GetRecipesResponse>(`/recipes${query}`, { signal });

  return response.data;
}
