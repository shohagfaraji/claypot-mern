export async function unpublishRecipe(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
) {
  await request(`/recipes/${recipeId}/unpublish`, { method: 'PATCH' });
}
