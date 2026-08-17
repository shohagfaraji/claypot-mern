import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAdminDashboardMock,
  listAdminRecipesMock,
  listAdminUsersMock,
  updateAdminUserRoleMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  getAdminDashboardMock: vi.fn(),
  listAdminRecipesMock: vi.fn(),
  listAdminUsersMock: vi.fn(),
  updateAdminUserRoleMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/admin.service.js', () => ({
  getAdminDashboard: getAdminDashboardMock,
  listAdminRecipes: listAdminRecipesMock,
  listAdminUsers: listAdminUsersMock,
  updateAdminUserRole: updateAdminUserRoleMock,
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

describe('PATCH /api/v1/admin/users/:userId/role', () => {
  const app = createApp();
  const userId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('changes a user role as an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'admin',
    });
    updateAdminUserRoleMock.mockResolvedValue({ id: userId, role: 'admin' });

    const response = await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ role: 'admin' })
      .expect(200);

    expect(updateAdminUserRoleMock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', userId, {
      role: 'admin',
    });
    expect(response.body.data.user).toEqual({ id: userId, role: 'admin' });
  });

  it('authorizes before validating role input', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    const response = await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ role: 'owner' })
      .expect(403);

    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects invalid identifiers and role values from an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });

    await request(app)
      .patch('/api/v1/admin/users/invalid-id/role')
      .set('Authorization', 'Bearer signed-access-token')
      .send({ role: 'admin' })
      .expect(400);
    await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('Authorization', 'Bearer signed-access-token')
      .send({ role: 'owner' })
      .expect(400);

    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/admin/users', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a validated user directory to an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });
    listAdminUsersMock.mockResolvedValue({
      items: [{ id: 'user-id', name: 'Amina Rahman', role: 'user' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/admin/users?role=user&verification=verified&sort=recent-login&search=amina')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listAdminUsersMock).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'amina',
      role: 'user',
      verification: 'verified',
      sort: 'recent-login',
    });
    expect(response.body.data.users[0].name).toBe('Amina Rahman');
  });

  it('authorizes before validating directory filters', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    const response = await request(app)
      .get('/api/v1/admin/users?role=owner')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(403);

    expect(listAdminUsersMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects invalid directory filters from an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });

    const response = await request(app)
      .get('/api/v1/admin/users?verification=pending')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(400);

    expect(listAdminUsersMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/admin/recipes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a validated moderation list to an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });
    listAdminRecipesMock.mockResolvedValue({
      items: [{ id: 'recipe-id', title: 'Spiced Claypot Rice', status: 'draft' }],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });

    const response = await request(app)
      .get('/api/v1/admin/recipes?page=2&status=draft&sort=updated&search=claypot%20rice')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listAdminRecipesMock).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'claypot rice',
      status: 'draft',
      sort: 'updated',
    });
    expect(response.body.data.pagination.total).toBe(11);
  });

  it('authorizes before validating moderation filters', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    const response = await request(app)
      .get('/api/v1/admin/recipes?status=archived')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(403);

    expect(listAdminRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects invalid filters from an administrator', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' });

    const response = await request(app)
      .get('/api/v1/admin/recipes?limit=100')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(400);

    expect(listAdminRecipesMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
