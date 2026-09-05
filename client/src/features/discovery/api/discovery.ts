import type { CookDiscoveryData, RecipeDiscoveryFacets } from '@/features/discovery/types';
import { apiRequest } from '@/lib/api-client';

interface GetRecipeDiscoveryFacetsResponse {
  data: RecipeDiscoveryFacets;
}

interface GetDiscoverableCooksResponse {
  data: CookDiscoveryData;
}

export async function getRecipeDiscoveryFacets(signal?: AbortSignal) {
  const response = await apiRequest<GetRecipeDiscoveryFacetsResponse>('/discovery/facets', {
    signal,
  });

  return response.data;
}

export async function getDiscoverableCooks(queryString: string, signal?: AbortSignal) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await apiRequest<GetDiscoverableCooksResponse>(`/discovery/cooks${query}`, {
    signal,
  });

  return response.data;
}
