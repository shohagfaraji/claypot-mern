import { describe, expect, it, vi } from 'vitest';

import { getAdminDashboard } from '@/features/admin/api/get-admin-dashboard';

describe('admin dashboard API', () => {
  it('requests the authenticated admin overview', async () => {
    const dashboard = {
      metrics: {
        totalUsers: 42,
        totalRecipes: 28,
        publishedRecipes: 19,
        draftRecipes: 9,
        totalReviews: 67,
      },
      recentRecipes: [],
      recentUsers: [],
    };
    const request = vi.fn().mockResolvedValue({ data: { dashboard } });
    const controller = new AbortController();

    await expect(getAdminDashboard(request, controller.signal)).resolves.toEqual(dashboard);
    expect(request).toHaveBeenCalledWith('/admin/dashboard', { signal: controller.signal });
  });
});
