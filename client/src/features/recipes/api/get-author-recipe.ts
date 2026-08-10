import type { AuthorRecipeDetail } from '@/features/recipes/types';

interface GetAuthorRecipeResponse {
  data: {
    recipe: AuthorRecipeDetail;
  };
}

export async function getAuthorRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
  signal?: AbortSignal,
) {
  const response = await request<GetAuthorRecipeResponse>(`/recipes/mine/${recipeId}`, { signal });

  return response.data.recipe;
}
