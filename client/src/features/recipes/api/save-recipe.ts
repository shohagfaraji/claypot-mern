export async function saveRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
) {
  await request(`/recipes/${recipeId}/save`, { method: 'PUT' });
}
