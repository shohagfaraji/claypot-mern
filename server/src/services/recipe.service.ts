import { randomBytes } from 'node:crypto';
import { Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import type { AccessTokenIdentity } from '../lib/access-token.js';
import { createSlugBase } from '../lib/slug.js';
import { RecipeModel, type Recipe } from '../models/recipe.model.js';
import type {
  CreateRecipeInput,
  ListOwnRecipesQuery,
  ListRecipesQuery,
} from '../schemas/recipe.schema.js';

const maximumCreateAttempts = 3;

export interface PublicRecipe extends Omit<Recipe, 'author'> {
  id: string;
  author: string;
}

export interface RecipeListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  difficulty: Recipe['difficulty'];
  cuisine: string;
  category: string;
  tags: string[];
  publishedAt: Date;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface RecipeDetail extends Omit<RecipeListItem, 'totalTimeMinutes'> {
  ingredients: Recipe['ingredients'];
  instructions: Recipe['instructions'];
  servings: number;
  totalTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRecipes {
  items: RecipeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthorRecipeListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  difficulty: Recipe['difficulty'];
  cuisine: string;
  category: string;
  tags: string[];
  status: Recipe['status'];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedAuthorRecipes {
  items: AuthorRecipeListItem[];
  pagination: PaginatedRecipes['pagination'];
}

interface RecipeListAggregation {
  items: RecipeListItem[];
  metadata: Array<{ total: number }>;
}

interface AuthorRecipeListAggregation {
  items: AuthorRecipeListItem[];
  metadata: Array<{ total: number }>;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function toPublicRecipe(recipe: Recipe & { id: string }): PublicRecipe {
  return {
    id: recipe.id,
    author: recipe.author.toString(),
    title: recipe.title,
    slug: recipe.slug,
    summary: recipe.summary,
    imageUrl: recipe.imageUrl,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    category: recipe.category,
    tags: recipe.tags,
    status: recipe.status,
    publishedAt: recipe.publishedAt,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

export async function createRecipe(
  authorId: string,
  input: CreateRecipeInput,
): Promise<PublicRecipe> {
  const author = new Types.ObjectId(authorId);
  const slugBase = createSlugBase(input.title);
  let slug = slugBase;

  for (let attempt = 1; attempt <= maximumCreateAttempts; attempt += 1) {
    try {
      const recipe = await RecipeModel.create({
        author,
        title: input.title,
        slug,
        summary: input.summary,
        imageUrl: input.imageUrl ?? null,
        ingredients: input.ingredients,
        instructions: input.instructions.map((instruction, index) => ({
          step: index + 1,
          description: instruction.description,
        })),
        prepTimeMinutes: input.prepTimeMinutes,
        cookTimeMinutes: input.cookTimeMinutes,
        servings: input.servings,
        difficulty: input.difficulty,
        cuisine: input.cuisine,
        category: input.category,
        tags: input.tags,
      });

      return toPublicRecipe(recipe);
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt === maximumCreateAttempts) {
        throw error;
      }

      slug = `${slugBase}-${randomBytes(3).toString('hex')}`;
    }
  }

  throw new Error('Recipe creation attempts exhausted.');
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRecipeSort(sort: ListRecipesQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListRecipesQuery['sort'], Record<string, 1 | -1>> = {
    newest: { publishedAt: -1, _id: -1 },
    oldest: { publishedAt: 1, _id: 1 },
    quickest: { totalTimeMinutes: 1, publishedAt: -1 },
  };

  return sorts[sort];
}

export async function listPublishedRecipes(query: ListRecipesQuery): Promise<PaginatedRecipes> {
  const match: Record<string, unknown> = {
    status: 'published',
  };

  if (query.search !== undefined) {
    match.$text = { $search: query.search };
  }

  if (query.difficulty !== undefined) {
    match.difficulty = query.difficulty;
  }

  if (query.cuisine !== undefined) {
    match.cuisine = new RegExp(`^${escapeRegularExpression(query.cuisine)}$`, 'i');
  }

  if (query.category !== undefined) {
    match.category = new RegExp(`^${escapeRegularExpression(query.category)}$`, 'i');
  }

  if (query.tags.length > 0) {
    match.tags = { $all: query.tags };
  }

  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $addFields: {
        totalTimeMinutes: { $add: ['$prepTimeMinutes', '$cookTimeMinutes'] },
      },
    },
    { $sort: getRecipeSort(query.sort) },
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
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              title: 1,
              slug: 1,
              summary: 1,
              imageUrl: 1,
              prepTimeMinutes: 1,
              cookTimeMinutes: 1,
              totalTimeMinutes: 1,
              difficulty: 1,
              cuisine: 1,
              category: 1,
              tags: 1,
              publishedAt: 1,
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
  const [result] = await RecipeModel.aggregate<RecipeListAggregation>(pipeline);
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

export async function getPublishedRecipeBySlug(slug: string): Promise<RecipeDetail> {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        slug,
        status: 'published',
      },
    },
    { $limit: 1 },
    {
      $addFields: {
        totalTimeMinutes: { $add: ['$prepTimeMinutes', '$cookTimeMinutes'] },
      },
    },
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
        summary: 1,
        imageUrl: 1,
        ingredients: 1,
        instructions: 1,
        prepTimeMinutes: 1,
        cookTimeMinutes: 1,
        totalTimeMinutes: 1,
        servings: 1,
        difficulty: 1,
        cuisine: 1,
        category: 1,
        tags: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        author: {
          id: { $toString: '$authorProfile._id' },
          name: '$authorProfile.name',
          username: '$authorProfile.username',
          avatarUrl: '$authorProfile.avatarUrl',
        },
      },
    },
  ];
  const [recipe] = await RecipeModel.aggregate<RecipeDetail>(pipeline);

  if (recipe === undefined) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  return recipe;
}

export async function publishRecipe(
  recipeId: string,
  actor: AccessTokenIdentity,
): Promise<PublicRecipe> {
  const recipe = await RecipeModel.findOne(getOwnedRecipeFilter(recipeId, actor));

  if (recipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  if (recipe.status !== 'published' || recipe.publishedAt === null) {
    recipe.status = 'published';
    recipe.publishedAt = new Date();
    await recipe.save();
  }

  return toPublicRecipe(recipe);
}

function getOwnedRecipeFilter(recipeId: string, actor: AccessTokenIdentity) {
  const filter: Record<string, unknown> = {
    _id: new Types.ObjectId(recipeId),
  };

  if (actor.role !== 'admin') {
    filter.author = new Types.ObjectId(actor.userId);
  }

  return filter;
}

export async function getAuthorRecipe(
  recipeId: string,
  actor: AccessTokenIdentity,
): Promise<PublicRecipe> {
  const recipe = await RecipeModel.findOne(getOwnedRecipeFilter(recipeId, actor));

  if (recipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  return toPublicRecipe(recipe);
}

export async function updateRecipe(
  recipeId: string,
  actor: AccessTokenIdentity,
  input: CreateRecipeInput,
): Promise<PublicRecipe> {
  const recipe = await RecipeModel.findOne(getOwnedRecipeFilter(recipeId, actor));

  if (recipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  recipe.title = input.title;
  recipe.summary = input.summary;
  recipe.imageUrl = input.imageUrl ?? null;
  recipe.ingredients = input.ingredients;
  recipe.instructions = input.instructions.map((instruction, index) => ({
    step: index + 1,
    description: instruction.description,
  }));
  recipe.prepTimeMinutes = input.prepTimeMinutes;
  recipe.cookTimeMinutes = input.cookTimeMinutes;
  recipe.servings = input.servings;
  recipe.difficulty = input.difficulty;
  recipe.cuisine = input.cuisine;
  recipe.category = input.category;
  recipe.tags = input.tags;
  await recipe.save();

  return toPublicRecipe(recipe);
}

export async function deleteRecipe(recipeId: string, actor: AccessTokenIdentity): Promise<void> {
  const recipe = await RecipeModel.findOneAndDelete(getOwnedRecipeFilter(recipeId, actor));

  if (recipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }
}

function getAuthorRecipeSort(sort: ListOwnRecipesQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListOwnRecipesQuery['sort'], Record<string, 1 | -1>> = {
    updated: { updatedAt: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
  };

  return sorts[sort];
}

export async function listAuthorRecipes(
  authorId: string,
  query: ListOwnRecipesQuery,
): Promise<PaginatedAuthorRecipes> {
  const match: Record<string, unknown> = {
    author: new Types.ObjectId(authorId),
  };

  if (query.search !== undefined) {
    match.$text = { $search: query.search };
  }

  if (query.status !== undefined) {
    match.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $addFields: {
        totalTimeMinutes: { $add: ['$prepTimeMinutes', '$cookTimeMinutes'] },
      },
    },
    { $sort: getAuthorRecipeSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              title: 1,
              slug: 1,
              summary: 1,
              imageUrl: 1,
              prepTimeMinutes: 1,
              cookTimeMinutes: 1,
              totalTimeMinutes: 1,
              difficulty: 1,
              cuisine: 1,
              category: 1,
              tags: 1,
              status: 1,
              publishedAt: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];
  const [result] = await RecipeModel.aggregate<AuthorRecipeListAggregation>(pipeline);
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
