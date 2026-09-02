import { describe, expect, it, vi } from 'vitest';

import {
  followCook,
  getCookConnections,
  getFollowingFeed,
  getFollowStatus,
  unfollowCook,
} from '@/features/follows/api/follows';
import { apiRequest } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn() }));

describe('cook following API', () => {
  it('loads and updates follow status through authenticated requests', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ data: { following: false } })
      .mockResolvedValueOnce({ data: { following: true } })
      .mockResolvedValueOnce(undefined);
    const controller = new AbortController();

    await expect(getFollowStatus(request, 'cook-id', controller.signal)).resolves.toBe(false);
    await expect(followCook(request, 'cook-id')).resolves.toBe(true);
    await expect(unfollowCook(request, 'cook-id')).resolves.toBeUndefined();

    expect(request).toHaveBeenNthCalledWith(1, '/follows/cook-id/status', {
      signal: controller.signal,
    });
    expect(request).toHaveBeenNthCalledWith(2, '/follows/cook-id', { method: 'POST' });
    expect(request).toHaveBeenNthCalledWith(3, '/follows/cook-id', { method: 'DELETE' });
  });

  it('loads a public connection page with an encoded username', async () => {
    const data = {
      cooks: [{ id: 'cook-id', name: 'Amina', username: 'amina' }],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    };
    vi.mocked(apiRequest).mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getCookConnections('amina kitchen', 'followers', 'page=2&limit=12', controller.signal),
    ).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith('/users/amina%20kitchen/followers?page=2&limit=12', {
      signal: controller.signal,
    });
  });

  it('loads the authenticated following feed with its filters', async () => {
    const data = {
      recipes: [{ id: 'recipe-id', title: 'Dal' }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
      followingCount: 4,
    };
    const request = vi.fn().mockResolvedValue({ data });
    const controller = new AbortController();

    await expect(
      getFollowingFeed(request, 'page=1&limit=9&difficulty=easy', controller.signal),
    ).resolves.toEqual(data);
    expect(request).toHaveBeenCalledWith('/feed?page=1&limit=9&difficulty=easy', {
      signal: controller.signal,
    });
  });
});
