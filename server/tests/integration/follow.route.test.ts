import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  followCookMock,
  getFollowStatusMock,
  getPublicUserIdMock,
  listCookConnectionsMock,
  listFollowingFeedMock,
  unfollowCookMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  followCookMock: vi.fn(),
  getFollowStatusMock: vi.fn(),
  getPublicUserIdMock: vi.fn(),
  listCookConnectionsMock: vi.fn(),
  listFollowingFeedMock: vi.fn(),
  unfollowCookMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));
vi.mock('../../src/services/follow.service.js', () => ({
  followCook: followCookMock,
  getFollowStatus: getFollowStatusMock,
  listCookConnections: listCookConnectionsMock,
  listFollowingFeed: listFollowingFeedMock,
  unfollowCook: unfollowCookMock,
}));
vi.mock('../../src/services/user-profile.service.js', () => ({
  getPublicUserId: getPublicUserIdMock,
  getPublicUserProfile: vi.fn(),
}));

import { createApp } from '../../src/app.js';

const userId = '507f1f77bcf86cd799439011';

describe('follow routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    verifyAccessTokenMock.mockResolvedValue({ userId: 'current-user', role: 'user' });
  });

  it('follows a validated cook with an account rate limit', async () => {
    followCookMock.mockResolvedValue(true);

    const response = await request(app)
      .post(`/api/v1/follows/${userId.toUpperCase()}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(201);

    expect(followCookMock).toHaveBeenCalledWith('current-user', userId);
    expect(response.body.data.following).toBe(true);
    expect(response.headers['ratelimit-policy']).toContain('follow-action');
  });

  it('returns status and removes a relationship for the current user', async () => {
    getFollowStatusMock.mockResolvedValue(true);

    const statusResponse = await request(app)
      .get(`/api/v1/follows/${userId}/status`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);
    await request(app)
      .delete(`/api/v1/follows/${userId}`)
      .set('Authorization', 'Bearer signed-access-token')
      .expect(204);

    expect(statusResponse.body.data.following).toBe(true);
    expect(getFollowStatusMock).toHaveBeenCalledWith('current-user', userId);
    expect(unfollowCookMock).toHaveBeenCalledWith('current-user', userId);
  });

  it('returns a filtered feed for followed cooks', async () => {
    listFollowingFeedMock.mockResolvedValue({
      items: [{ id: 'recipe-id' }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
      followingCount: 3,
    });

    const response = await request(app)
      .get('/api/v1/feed?limit=9&difficulty=easy')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(listFollowingFeedMock).toHaveBeenCalledWith('current-user', {
      page: 1,
      limit: 9,
      difficulty: 'easy',
      tags: [],
      sort: 'newest',
    });
    expect(response.body.data).toMatchObject({ followingCount: 3 });
  });

  it('returns public follower and following lists', async () => {
    getPublicUserIdMock.mockResolvedValue(userId);
    listCookConnectionsMock.mockResolvedValue({
      items: [{ id: 'cook-id', username: 'amina_kitchen' }],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    await request(app).get('/api/v1/users/amina_kitchen/followers').expect(200);
    await request(app).get('/api/v1/users/amina_kitchen/following?page=2').expect(200);

    expect(listCookConnectionsMock).toHaveBeenNthCalledWith(1, userId, 'followers', {
      page: 1,
      limit: 12,
    });
    expect(listCookConnectionsMock).toHaveBeenNthCalledWith(2, userId, 'following', {
      page: 2,
      limit: 12,
    });
  });

  it('authenticates before validating follow mutations', async () => {
    verifyAccessTokenMock.mockRejectedValue(new Error('invalid token'));

    await request(app).post('/api/v1/follows/invalid').expect(401);
    expect(followCookMock).not.toHaveBeenCalled();
  });
});
