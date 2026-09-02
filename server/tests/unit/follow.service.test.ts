import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aggregateMock,
  createFollowerNotificationMock,
  deleteOneMock,
  distinctMock,
  endSessionMock,
  followExistsMock,
  listPublishedRecipesMock,
  startSessionMock,
  updateOneMock,
  userExistsMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
  createFollowerNotificationMock: vi.fn(),
  deleteOneMock: vi.fn(),
  distinctMock: vi.fn(),
  endSessionMock: vi.fn(),
  followExistsMock: vi.fn(),
  listPublishedRecipesMock: vi.fn(),
  startSessionMock: vi.fn(),
  updateOneMock: vi.fn(),
  userExistsMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));
vi.mock('../../src/models/follow.model.js', () => ({
  FollowModel: {
    aggregate: aggregateMock,
    deleteOne: deleteOneMock,
    distinct: distinctMock,
    exists: followExistsMock,
    updateOne: updateOneMock,
  },
}));
vi.mock('../../src/models/user.model.js', () => ({
  UserModel: { exists: userExistsMock },
}));
vi.mock('../../src/services/notification.service.js', () => ({
  createFollowerNotification: createFollowerNotificationMock,
}));
vi.mock('../../src/services/recipe.service.js', () => ({
  listPublishedRecipes: listPublishedRecipesMock,
}));

import {
  followCook,
  getFollowStatus,
  listCookConnections,
  listFollowingFeed,
  unfollowCook,
} from '../../src/services/follow.service.js';

const followerId = '507f1f77bcf86cd799439011';
const followingId = '507f1f77bcf86cd799439012';
const transactionSession = { id: 'transaction-session' };

describe('follow service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    userExistsMock.mockResolvedValue({ _id: new Types.ObjectId(followingId) });
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
      ...transactionSession,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<unknown>) =>
      operation(),
    );
  });

  it('creates one relationship and follower notification transactionally', async () => {
    updateOneMock.mockResolvedValue({ upsertedCount: 1 });

    await expect(followCook(followerId, followingId)).resolves.toBe(true);
    const follower = new Types.ObjectId(followerId);
    const following = new Types.ObjectId(followingId);
    expect(updateOneMock).toHaveBeenCalledWith(
      { follower, following },
      { $setOnInsert: { follower, following } },
      { upsert: true, session: expect.objectContaining(transactionSession) },
    );
    expect(createFollowerNotificationMock).toHaveBeenCalledWith({
      recipientId: following,
      actorId: follower,
      session: expect.objectContaining(transactionSession),
    });
    expect(withTransactionMock).toHaveBeenCalledOnce();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('treats an existing relationship as an idempotent success', async () => {
    updateOneMock.mockResolvedValue({ upsertedCount: 0 });

    await expect(followCook(followerId, followingId)).resolves.toBe(false);
    expect(createFollowerNotificationMock).not.toHaveBeenCalled();
  });

  it('treats a concurrent duplicate relationship as an idempotent success', async () => {
    updateOneMock.mockRejectedValue({ code: 11000 });

    await expect(followCook(followerId, followingId)).resolves.toBe(false);
    expect(createFollowerNotificationMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('rejects self follows and missing cooks', async () => {
    await expect(followCook(followerId, followerId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'SELF_FOLLOW_NOT_ALLOWED',
    });
    expect(userExistsMock).not.toHaveBeenCalled();

    userExistsMock.mockResolvedValue(null);
    await expect(followCook(followerId, followingId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('removes and checks an owned relationship', async () => {
    followExistsMock.mockResolvedValue({ _id: new Types.ObjectId() });

    await unfollowCook(followerId, followingId);
    await expect(getFollowStatus(followerId, followingId)).resolves.toBe(true);
    const filter = {
      follower: new Types.ObjectId(followerId),
      following: new Types.ObjectId(followingId),
    };
    expect(deleteOneMock).toHaveBeenCalledWith(filter);
    expect(followExistsMock).toHaveBeenCalledWith(filter);
    await expect(getFollowStatus(followerId, followerId)).resolves.toBe(false);
  });

  it('lists either side of a cook relationship with stable pagination', async () => {
    const cook = { id: followerId, username: 'amina_kitchen' };
    aggregateMock.mockResolvedValue([{ items: [cook], metadata: [{ total: 13 }] }]);

    await expect(
      listCookConnections(followingId, 'followers', { page: 2, limit: 12 }),
    ).resolves.toEqual({
      items: [cook],
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
    });
    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: { following: new Types.ObjectId(followingId) },
    });
    expect(pipeline[1]).toEqual({ $sort: { createdAt: -1, _id: -1 } });
  });

  it('builds a recipe feed from followed cook IDs', async () => {
    const followedIds = [new Types.ObjectId(followingId), new Types.ObjectId()];
    distinctMock.mockResolvedValue(followedIds);
    listPublishedRecipesMock.mockResolvedValue({
      items: [{ id: 'recipe-id' }],
      pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
    });
    const query = { page: 1, limit: 9, tags: [], sort: 'newest' as const };

    await expect(listFollowingFeed(followerId, query)).resolves.toMatchObject({
      items: [{ id: 'recipe-id' }],
      followingCount: 2,
    });
    expect(distinctMock).toHaveBeenCalledWith('following', {
      follower: new Types.ObjectId(followerId),
    });
    expect(listPublishedRecipesMock).toHaveBeenCalledWith(
      query,
      followedIds.map((id) => id.toString()),
    );
  });
});
