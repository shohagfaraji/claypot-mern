import type {
  CookConnectionListData,
  CookConnectionType,
  FollowingFeedData,
} from '@/features/follows/types';
import { apiRequest } from '@/lib/api-client';

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

interface FollowStatusResponse {
  data: { following: boolean };
}

interface CookConnectionListResponse {
  data: CookConnectionListData;
}

interface FollowingFeedResponse {
  data: FollowingFeedData;
}

export async function getFollowStatus(
  request: AuthenticatedRequest,
  userId: string,
  signal?: AbortSignal,
) {
  const response = await request<FollowStatusResponse>(`/follows/${userId}/status`, { signal });
  return response.data.following;
}

export async function followCook(request: AuthenticatedRequest, userId: string) {
  const response = await request<FollowStatusResponse>(`/follows/${userId}`, { method: 'POST' });
  return response.data.following;
}

export async function unfollowCook(request: AuthenticatedRequest, userId: string) {
  await request(`/follows/${userId}`, { method: 'DELETE' });
}

export async function getCookConnections(
  username: string,
  connection: CookConnectionType,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await apiRequest<CookConnectionListResponse>(
    `/users/${encodeURIComponent(username)}/${connection}${query}`,
    { signal },
  );
  return response.data;
}

export async function getFollowingFeed(
  request: AuthenticatedRequest,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<FollowingFeedResponse>(`/feed${query}`, { signal });
  return response.data;
}
