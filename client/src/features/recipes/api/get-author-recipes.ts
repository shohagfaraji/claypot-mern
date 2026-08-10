import type { AuthorRecipeListData } from '@/features/recipes/types';

interface GetAuthorRecipesResponse {
  data: AuthorRecipeListData;
}

export async function getAuthorRecipes(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<GetAuthorRecipesResponse>(`/recipes/mine${query}`, { signal });

  return response.data;
}
