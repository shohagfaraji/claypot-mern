import type { CreateRecipeInput } from '@/features/recipes/types';

interface CreateRecipeResponse {
  data: {
    recipe: {
      id: string;
      slug: string;
      status: 'draft';
    };
  };
}

export async function createRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  input: CreateRecipeInput,
) {
  const response = await request<CreateRecipeResponse>('/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return response.data.recipe;
}
