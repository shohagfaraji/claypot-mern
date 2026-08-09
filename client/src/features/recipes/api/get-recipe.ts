import type { RecipeDetail } from '@/features/recipes/types';
import { apiRequest } from '@/lib/api-client';

interface GetRecipeResponse {
  data: {
    recipe: RecipeDetail;
  };
}

export async function getRecipe(slug: string, signal?: AbortSignal) {
  const response = await apiRequest<GetRecipeResponse>(`/recipes/${encodeURIComponent(slug)}`, {
    signal,
  });

  return response.data.recipe;
}
