import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminDashboardMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  getAdminDashboardMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/admin.service.js', () => ({
  getAdminDashboard: getAdminDashboardMock,
}));

import { createApp } from '../../src/app.js';

describe('GET /api/v1/admin/dashboard', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns dashboard data to an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });
    getAdminDashboardMock.mockResolvedValue({
      metrics: {
        totalUsers: 42,
        totalRecipes: 28,
        publishedRecipes: 19,
        draftRecipes: 9,
        totalReviews: 67,
      },
      recentRecipes: [],
      recentUsers: [],
    });

    const response = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(getAdminDashboardMock).toHaveBeenCalledOnce();
    expect(response.body.data.dashboard.metrics.totalUsers).toBe(42);
  });

  it('rejects authenticated users without the admin role', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    const response = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(403);

    expect(getAdminDashboardMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects requests without an access token', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard').expect(401);

    expect(getAdminDashboardMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
