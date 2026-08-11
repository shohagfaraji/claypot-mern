import type { UserRecipeListData } from '@/features/users/types';
import { apiRequest } from '@/lib/api-client';

interface GetUserRecipesResponse {
  data: UserRecipeListData;
}

export async function getUserRecipes(username: string, queryString: string, signal?: AbortSignal) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await apiRequest<GetUserRecipesResponse>(
    `/users/${encodeURIComponent(username)}/recipes${query}`,
    { signal },
  );

  return response.data;
}
