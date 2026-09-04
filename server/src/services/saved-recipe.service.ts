import { Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { RecipeModel } from '../models/recipe.model.js';
import { SavedRecipeModel } from '../models/saved-recipe.model.js';
import type { ListSavedRecipesQuery } from '../schemas/recipe.schema.js';
import type { RecipeListItem } from './recipe.service.js';

export interface SavedRecipeListItem extends RecipeListItem {
  savedAt: Date;
}

export interface PaginatedSavedRecipes {
  items: SavedRecipeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SavedRecipeAggregation {
  items: SavedRecipeListItem[];
  metadata: Array<{ total: number }>;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSavedRecipeSort(sort: ListSavedRecipesQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListSavedRecipesQuery['sort'], Record<string, 1 | -1>> = {
    saved: { createdAt: -1, _id: -1 },
    newest: { 'recipe.publishedAt': -1, _id: -1 },
    quickest: { totalTimeMinutes: 1, createdAt: -1 },
  };

  return sorts[sort];
}

export async function saveRecipe(userId: string, recipeId: string): Promise<void> {
  const user = new Types.ObjectId(userId);
  const recipe = new Types.ObjectId(recipeId);
  const publishedRecipeExists = await RecipeModel.exists({
    _id: recipe,
    status: 'published',
  });

  if (publishedRecipeExists === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  await SavedRecipeModel.updateOne(
    { user, recipe },
    { $setOnInsert: { user, recipe } },
    { upsert: true },
  );
}

export async function unsaveRecipe(userId: string, recipeId: string): Promise<void> {
  await SavedRecipeModel.deleteOne({
    user: new Types.ObjectId(userId),
    recipe: new Types.ObjectId(recipeId),
  });
}

export async function isRecipeSaved(userId: string, recipeId: string): Promise<boolean> {
  const savedRecipe = await SavedRecipeModel.exists({
    user: new Types.ObjectId(userId),
    recipe: new Types.ObjectId(recipeId),
  });

  return savedRecipe !== null;
}

export async function listSavedRecipes(
  userId: string,
  query: ListSavedRecipesQuery,
  collectionId?: string,
): Promise<PaginatedSavedRecipes> {
  const recipeMatch: Record<string, unknown> = {
    'recipe.status': 'published',
  };

  if (query.search !== undefined) {
    const search = new RegExp(escapeRegularExpression(query.search), 'i');
    recipeMatch.$or = [
      { 'recipe.title': search },
      { 'recipe.summary': search },
      { 'recipe.tags': search },
    ];
  }

  if (query.difficulty !== undefined) {
    recipeMatch['recipe.difficulty'] = query.difficulty;
  }

  if (query.cuisine !== undefined) {
    recipeMatch['recipe.cuisine'] = new RegExp(`^${escapeRegularExpression(query.cuisine)}$`, 'i');
  }

  if (query.category !== undefined) {
    recipeMatch['recipe.category'] = new RegExp(
      `^${escapeRegularExpression(query.category)}$`,
      'i',
    );
  }

  if (query.tags.length > 0) {
    recipeMatch['recipe.tags'] = { $all: query.tags };
  }

  const skip = (query.page - 1) * query.limit;
  const savedRecipeMatch: Record<string, unknown> = { user: new Types.ObjectId(userId) };
  if (collectionId !== undefined) {
    savedRecipeMatch.collections = new Types.ObjectId(collectionId);
  }
  const pipeline: PipelineStage[] = [
    { $match: savedRecipeMatch },
    {
      $lookup: {
        from: 'recipes',
        localField: 'recipe',
        foreignField: '_id',
        as: 'recipe',
      },
    },
    { $unwind: '$recipe' },
    { $match: recipeMatch },
    {
      $addFields: {
        totalTimeMinutes: { $add: ['$recipe.prepTimeMinutes', '$recipe.cookTimeMinutes'] },
      },
    },
    { $sort: getSavedRecipeSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $lookup: {
              from: 'users',
              localField: 'recipe.author',
              foreignField: '_id',
              as: 'authorProfile',
            },
          },
          { $unwind: '$authorProfile' },
          {
            $lookup: {
              from: 'reviews',
              let: { recipeId: '$recipe._id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$recipe', '$$recipeId'] },
                  },
                },
                {
                  $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                  },
                },
              ],
              as: 'reviewSummary',
            },
          },
          {
            $set: {
              reviewSummary: {
                $ifNull: [
                  { $arrayElemAt: ['$reviewSummary', 0] },
                  { averageRating: 0, reviewCount: 0 },
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              id: { $toString: '$recipe._id' },
              title: '$recipe.title',
              slug: '$recipe.slug',
              summary: '$recipe.summary',
              imageUrl: '$recipe.imageUrl',
              prepTimeMinutes: '$recipe.prepTimeMinutes',
              cookTimeMinutes: '$recipe.cookTimeMinutes',
              totalTimeMinutes: 1,
              difficulty: '$recipe.difficulty',
              cuisine: '$recipe.cuisine',
              category: '$recipe.category',
              tags: '$recipe.tags',
              publishedAt: '$recipe.publishedAt',
              savedAt: '$createdAt',
              averageRating: '$reviewSummary.averageRating',
              reviewCount: '$reviewSummary.reviewCount',
              author: {
                id: { $toString: '$authorProfile._id' },
                name: '$authorProfile.name',
                username: '$authorProfile.username',
                avatarUrl: '$authorProfile.avatarUrl',
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];
  const [result] = await SavedRecipeModel.aggregate<SavedRecipeAggregation>(pipeline);
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
