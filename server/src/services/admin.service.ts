import { RecipeModel } from '../models/recipe.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
import type { ListAdminRecipesQuery } from '../schemas/admin.schema.js';

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

export interface AdminRecipeListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  status: 'draft' | 'published';
  reviewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    username: string;
  };
}

interface AdminRecipeListAggregation {
  items: AdminRecipeListItem[];
  metadata: Array<{ total: number }>;
}

export interface PaginatedAdminRecipes {
  items: AdminRecipeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const recentItemLimit = 5;

function getAdminRecipeSort(sort: ListAdminRecipesQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListAdminRecipesQuery['sort'], Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    updated: { updatedAt: -1, _id: -1 },
  };

  return sorts[sort];
}

export async function listAdminRecipes(
  query: ListAdminRecipesQuery,
): Promise<PaginatedAdminRecipes> {
  const match: Record<string, unknown> = {};

  if (query.search !== undefined) {
    match.$text = { $search: query.search };
  }

  if (query.status !== undefined) {
    match.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [result] = await RecipeModel.aggregate<AdminRecipeListAggregation>([
    { $match: match },
    { $sort: getAdminRecipeSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
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
            $lookup: {
              from: 'reviews',
              let: { recipeId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$recipe', '$$recipeId'] },
                  },
                },
                { $count: 'total' },
              ],
              as: 'reviewSummary',
            },
          },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              title: 1,
              slug: 1,
              summary: 1,
              imageUrl: 1,
              status: 1,
              reviewCount: {
                $ifNull: [{ $arrayElemAt: ['$reviewSummary.total', 0] }, 0],
              },
              publishedAt: 1,
              createdAt: 1,
              updatedAt: 1,
              author: {
                id: { $toString: '$authorProfile._id' },
                name: '$authorProfile.name',
                username: '$authorProfile.username',
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ]);
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
