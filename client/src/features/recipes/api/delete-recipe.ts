export async function deleteRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
) {
  await request<void>(`/recipes/${recipeId}`, { method: 'DELETE' });
}
