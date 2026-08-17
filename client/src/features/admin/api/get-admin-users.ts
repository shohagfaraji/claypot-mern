import type { AdminUserListData } from '@/features/admin/types';

interface GetAdminUsersResponse {
  data: AdminUserListData;
}

export async function getAdminUsers(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  queryString: string,
  signal?: AbortSignal,
) {
  const query = queryString.length > 0 ? `?${queryString}` : '';
  const response = await request<GetAdminUsersResponse>(`/admin/users${query}`, { signal });
  return response.data;
}
