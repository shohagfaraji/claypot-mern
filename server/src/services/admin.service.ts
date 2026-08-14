import { RecipeModel } from '../models/recipe.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalRecipes: number;
  publishedRecipes: number;
  draftRecipes: number;
  totalReviews: number;
}

export interface AdminRecentRecipe {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  createdAt: Date;
  author: {
    name: string;
    username: string;
  };
}

export interface AdminRecentUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface AdminDashboard {
  metrics: AdminDashboardMetrics;
  recentRecipes: AdminRecentRecipe[];
  recentUsers: AdminRecentUser[];
}

const recentItemLimit = 5;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [
    totalUsers,
    totalRecipes,
    publishedRecipes,
    draftRecipes,
    totalReviews,
    recentRecipes,
    recentUsers,
  ] = await Promise.all([
    UserModel.countDocuments({}),
    RecipeModel.countDocuments({}),
    RecipeModel.countDocuments({ status: 'published' }),
    RecipeModel.countDocuments({ status: 'draft' }),
    ReviewModel.countDocuments({}),
    RecipeModel.aggregate<AdminRecentRecipe>([
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: recentItemLimit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorProfile',
        },
      },
      { $unwind: '$authorProfile' },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          title: 1,
          slug: 1,
          status: 1,
          createdAt: 1,
          author: {
            name: '$authorProfile.name',
            username: '$authorProfile.username',
          },
        },
      },
    ]),
    UserModel.aggregate<AdminRecentUser>([
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: recentItemLimit },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          name: 1,
          username: 1,
          avatarUrl: 1,
          role: 1,
          createdAt: 1,
        },
      },
    ]),
  ]);

  return {
    metrics: {
      totalUsers,
      totalRecipes,
      publishedRecipes,
      draftRecipes,
      totalReviews,
    },
    recentRecipes,
    recentUsers,
  };
}
