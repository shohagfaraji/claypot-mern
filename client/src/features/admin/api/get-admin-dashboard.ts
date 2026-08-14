import type { AdminDashboard } from '@/features/admin/types';

interface GetAdminDashboardResponse {
  data: {
    dashboard: AdminDashboard;
  };
}

export async function getAdminDashboard(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  signal?: AbortSignal,
) {
  const response = await request<GetAdminDashboardResponse>('/admin/dashboard', { signal });
  return response.data.dashboard;
}
