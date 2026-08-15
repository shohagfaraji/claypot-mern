import type { AdminRecipeListData } from '@/features/admin/types';

interface GetAdminRecipesResponse {
  data: AdminRecipeListData;
}

export async function getAdminRecipes(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<GetAdminRecipesResponse>(`/admin/recipes${query}`, { signal });
  return response.data;
}
