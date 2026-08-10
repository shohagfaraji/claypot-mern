import type { AuthorRecipeDetail, CreateRecipeInput } from '@/features/recipes/types';

interface UpdateRecipeResponse {
  data: {
    recipe: AuthorRecipeDetail;
  };
}

export async function updateRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
  input: CreateRecipeInput,
) {
  const response = await request<UpdateRecipeResponse>(`/recipes/${recipeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.recipe;
}
