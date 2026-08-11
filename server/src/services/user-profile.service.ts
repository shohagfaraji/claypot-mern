import { AppError } from '../errors/app-error.js';
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
}

export async function getPublicUserProfile(username: string): Promise<PublicUserProfile> {
  const user = await UserModel.findOne({ username }).select(
    'name username avatarUrl bio createdAt',
  );

  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.');
  }

  const publishedRecipeCount = await RecipeModel.countDocuments({
    author: user._id,
    status: 'published',
  });

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    publishedRecipeCount,
  };
}

export async function getPublicUserId(username: string): Promise<string> {
  const user = await UserModel.findOne({ username }).select('_id');

  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Cook profile was not found.');
  }

  return user.id;
}
