import { startSession, Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { FollowModel } from '../models/follow.model.js';
import { UserModel } from '../models/user.model.js';
import type { ListCookConnectionsQuery } from '../schemas/follow.schema.js';
import type { ListRecipesQuery } from '../schemas/recipe.schema.js';
import { createFollowerNotification } from './notification.service.js';
import { listPublishedRecipes, type PaginatedRecipes } from './recipe.service.js';

export interface CookConnection {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followedAt: Date;
}

export interface PaginatedCookConnections {
  items: CookConnection[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface FollowingFeed extends PaginatedRecipes {
  followingCount: number;
}

interface ConnectionAggregation {
  items: CookConnection[];
  metadata: Array<{ total: number }>;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function followCook(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) {
    throw new AppError(403, 'SELF_FOLLOW_NOT_ALLOWED', 'You cannot follow your own profile.');
  }

  const follower = new Types.ObjectId(followerId);
  const following = new Types.ObjectId(followingId);
  const targetExists = await UserModel.exists({ _id: following });
  if (targetExists === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.');
  }

  const session = await startSession();
  try {
    const created = await session.withTransaction(async () => {
      const result = await FollowModel.updateOne(
        { follower, following },
        { $setOnInsert: { follower, following } },
        { upsert: true, session },
      );

      if (result.upsertedCount === 0) return false;
      await createFollowerNotification({ recipientId: following, actorId: follower, session });
      return true;
    });

    return created ?? false;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function unfollowCook(followerId: string, followingId: string): Promise<void> {
  await FollowModel.deleteOne({
    follower: new Types.ObjectId(followerId),
    following: new Types.ObjectId(followingId),
  });
}

export async function getFollowStatus(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;

  const follow = await FollowModel.exists({
    follower: new Types.ObjectId(followerId),
    following: new Types.ObjectId(followingId),
  });
  return follow !== null;
}

export async function listCookConnections(
  userId: string,
  connection: 'followers' | 'following',
  query: ListCookConnectionsQuery,
): Promise<PaginatedCookConnections> {
  const userObjectId = new Types.ObjectId(userId);
  const match =
    connection === 'followers' ? { following: userObjectId } : { follower: userObjectId };
  const localField = connection === 'followers' ? 'follower' : 'following';
  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: {
              from: 'users',
              localField,
              foreignField: '_id',
              as: 'profile',
            },
          },
          { $unwind: '$profile' },
          {
            $project: {
              _id: 0,
              id: { $toString: '$profile._id' },
              name: '$profile.name',
              username: '$profile.username',
              avatarUrl: '$profile.avatarUrl',
              bio: '$profile.bio',
              followedAt: '$createdAt',
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];
  const [result] = await FollowModel.aggregate<ConnectionAggregation>(pipeline);
  const items = result?.items ?? [];
  const total = result?.metadata[0]?.total ?? 0;

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function listFollowingFeed(
  userId: string,
  query: ListRecipesQuery,
): Promise<FollowingFeed> {
  const followedCookIds = (await FollowModel.distinct('following', {
    follower: new Types.ObjectId(userId),
  })) as Types.ObjectId[];
  const result = await listPublishedRecipes(
    query,
    followedCookIds.map((id) => id.toString()),
  );

  return { ...result, followingCount: followedCookIds.length };
}
