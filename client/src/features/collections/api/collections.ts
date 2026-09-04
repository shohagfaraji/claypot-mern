import type {
  CollectionRecipeListData,
  RecipeCollection,
  RecipeCollectionInput,
  RecipeCollectionMembership,
} from '@/features/collections/types';

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

interface CollectionListResponse {
  data: { collections: RecipeCollection[] };
}

interface CollectionResponse {
  data: { collection: RecipeCollection };
}

interface CollectionMembershipResponse {
  data: { collections: RecipeCollectionMembership[] };
}

interface CollectionRecipeListResponse {
  data: CollectionRecipeListData;
}

export async function getRecipeCollections(request: AuthenticatedRequest, signal?: AbortSignal) {
  const response = await request<CollectionListResponse>('/collections', { signal });
  return response.data.collections;
}

export async function createRecipeCollection(
  request: AuthenticatedRequest,
  input: RecipeCollectionInput,
) {
  const response = await request<CollectionResponse>('/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.collection;
}

export async function updateRecipeCollection(
  request: AuthenticatedRequest,
  collectionId: string,
  input: RecipeCollectionInput,
) {
  const response = await request<CollectionResponse>(`/collections/${collectionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return response.data.collection;
}

export async function deleteRecipeCollection(request: AuthenticatedRequest, collectionId: string) {
  await request(`/collections/${collectionId}`, { method: 'DELETE' });
}

export async function getCollectionRecipes(
  request: AuthenticatedRequest,
  collectionId: string,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<CollectionRecipeListResponse>(
    `/collections/${collectionId}/recipes${query}`,
    { signal },
  );
  return response.data;
}

export async function getRecipeCollectionMemberships(
  request: AuthenticatedRequest,
  recipeId: string,
  signal?: AbortSignal,
) {
  const response = await request<CollectionMembershipResponse>(
    `/collections/memberships/${recipeId}`,
    { signal },
  );
  return response.data.collections;
}

export async function addRecipeToCollection(
  request: AuthenticatedRequest,
  collectionId: string,
  recipeId: string,
) {
  await request(`/collections/${collectionId}/recipes/${recipeId}`, { method: 'PUT' });
}

export async function removeRecipeFromCollection(
  request: AuthenticatedRequest,
  collectionId: string,
  recipeId: string,
) {
  await request(`/collections/${collectionId}/recipes/${recipeId}`, { method: 'DELETE' });
}
