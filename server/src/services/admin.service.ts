import { startSession, Types } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { RecipeModel } from '../models/recipe.model.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
import type {
  ListAdminRecipesQuery,
  ListAdminUsersQuery,
  UpdateAdminUserRoleInput,
} from '../schemas/admin.schema.js';

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

export interface AdminUserListItem {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  recipeCount: number;
  reviewCount: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface AdminUserListAggregation {
  items: AdminUserListItem[];
  metadata: Array<{ total: number }>;
}

export interface PaginatedAdminUsers {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserRoleUpdate {
  id: string;
  role: 'user' | 'admin';
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

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAdminUserSort(sort: ListAdminUsersQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListAdminUsersQuery['sort'], Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name: { name: 1, _id: 1 },
    'recent-login': { lastLoginAt: -1, _id: -1 },
  };

  return sorts[sort];
}

export async function listAdminUsers(query: ListAdminUsersQuery): Promise<PaginatedAdminUsers> {
  const match: Record<string, unknown> = {};

  if (query.search !== undefined) {
    const search = new RegExp(escapeRegularExpression(query.search), 'i');
    match.$or = [{ name: search }, { username: search }, { email: search }];
  }

  if (query.role !== undefined) {
    match.role = query.role;
  }

  if (query.verification !== undefined) {
    match.isEmailVerified = query.verification === 'verified';
  }

  const skip = (query.page - 1) * query.limit;
  const [result] = await UserModel.aggregate<AdminUserListAggregation>([
    { $match: match },
    { $sort: getAdminUserSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: {
              from: 'recipes',
              let: { userId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$author', '$$userId'] } } },
                { $count: 'total' },
              ],
              as: 'recipeSummary',
            },
          },
          {
            $lookup: {
              from: 'reviews',
              let: { userId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
                { $count: 'total' },
              ],
              as: 'reviewSummary',
            },
          },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              name: 1,
              username: 1,
              email: 1,
              avatarUrl: 1,
              role: 1,
              isEmailVerified: 1,
              recipeCount: {
                $ifNull: [{ $arrayElemAt: ['$recipeSummary.total', 0] }, 0],
              },
              reviewCount: {
                $ifNull: [{ $arrayElemAt: ['$reviewSummary.total', 0] }, 0],
              },
              lastLoginAt: 1,
              createdAt: 1,
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

export async function updateAdminUserRole(
  actorUserId: string,
  targetUserId: string,
  input: UpdateAdminUserRoleInput,
): Promise<AdminUserRoleUpdate> {
  if (actorUserId === targetUserId) {
    throw new AppError(400, 'ADMIN_SELF_ROLE_CHANGE', 'You cannot change your own admin role.');
  }

  const session = await startSession();
  const targetId = new Types.ObjectId(targetUserId);
  let updatedUser: AdminUserRoleUpdate | null = null;

  try {
    await session.withTransaction(async () => {
      const user = await UserModel.findOne({ _id: targetId }, null, { session });

      if (user === null) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
      }

      if (user.role === input.role) {
        updatedUser = { id: user.id, role: user.role };
        return;
      }

      if (user.role === 'admin' && input.role === 'user') {
        const adminCount = await UserModel.countDocuments({ role: 'admin' }, { session });

        if (adminCount <= 1) {
          throw new AppError(
            409,
            'LAST_ADMIN_REQUIRED',
            'The platform must keep at least one administrator.',
          );
        }
      }

      user.role = input.role;
      await user.save({ session });
      await RefreshSessionModel.updateMany(
        { user: targetId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { session },
      );
      updatedUser = { id: user.id, role: user.role };
    });
  } finally {
    await session.endSession();
  }

  if (updatedUser === null) {
    throw new Error('User role update did not complete.');
  }

  return updatedUser;
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
