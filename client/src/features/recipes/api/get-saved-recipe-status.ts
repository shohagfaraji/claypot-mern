interface GetSavedRecipeStatusResponse {
  data: {
    isSaved: boolean;
  };
}

export async function getSavedRecipeStatus(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  recipeId: string,
  signal?: AbortSignal,
) {
  const response = await request<GetSavedRecipeStatusResponse>(`/recipes/${recipeId}/save`, {
    signal,
  });

  return response.data.isSaved;
}
