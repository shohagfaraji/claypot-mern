import { AppError } from '../errors/app-error.js';
import { FollowModel } from '../models/follow.model.js';
import { RecipeModel } from '../models/recipe.model.js';
import { UserModel } from '../models/user.model.js';

export interface PublicUserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  publishedRecipeCount: number;
  followerCount: number;
  followingCount: number;
}

export async function getPublicUserProfile(username: string): Promise<PublicUserProfile> {
  const user = await UserModel.findOne({ username }).select(
    'name username avatarUrl bio createdAt',
  );

  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.');
  }

  const [publishedRecipeCount, followerCount, followingCount] = await Promise.all([
    RecipeModel.countDocuments({ author: user._id, status: 'published' }),
    FollowModel.countDocuments({ following: user._id }),
    FollowModel.countDocuments({ follower: user._id }),
  ]);

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    publishedRecipeCount,
    followerCount,
    followingCount,
  };
}

export async function getPublicUserId(username: string): Promise<string> {
  const user = await UserModel.findOne({ username }).select('_id');

  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.');
  }

  return user.id;
}
