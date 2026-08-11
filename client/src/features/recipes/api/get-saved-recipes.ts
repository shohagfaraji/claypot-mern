import type { SavedRecipeListData } from '@/features/recipes/types';

interface GetSavedRecipesResponse {
  data: SavedRecipeListData;
}

export async function getSavedRecipes(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<GetSavedRecipesResponse>(`/recipes/saved${query}`, { signal });

  return response.data;
}
