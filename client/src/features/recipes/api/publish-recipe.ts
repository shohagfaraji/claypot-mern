export async function publishRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
) {
  await request(`/recipes/${recipeId}/publish`, { method: 'PATCH' });
}
