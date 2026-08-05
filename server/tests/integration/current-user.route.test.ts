import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUserMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/auth.service.js', () => ({
  authenticateUser: vi.fn(),
  getCurrentUser: getCurrentUserMock,
  registerUser: vi.fn(),
}));

vi.mock('../../src/services/session.service.js', () => ({
  createAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
  rotateAuthSession: vi.fn(),
}));

import { createApp } from '../../src/app.js';

describe('GET /api/v1/auth/me', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the authenticated user', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: 'user-id',
      role: 'user',
    });
    getCurrentUserMock.mockResolvedValue({
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(getCurrentUserMock).toHaveBeenCalledWith('user-id');
    expect(response.body).toEqual({
      data: {
        user: {
          id: 'user-id',
          name: 'Amina Rahman',
          username: 'amina_kitchen',
          email: 'amina@example.com',
          avatarUrl: null,
          bio: null,
          role: 'user',
          isEmailVerified: false,
          createdAt: '2026-07-27T08:00:00.000Z',
        },
      },
    });
  });

  it('rejects requests without an access token', async () => {
    const response = await request(app).get('/api/v1/auth/me').expect(401);

    expect(getCurrentUserMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
