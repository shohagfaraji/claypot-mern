import { startSession, Types, type PipelineStage } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { RecipeCollectionModel, type RecipeCollection } from '../models/recipe-collection.model.js';
import { RecipeModel } from '../models/recipe.model.js';
import { SavedRecipeModel } from '../models/saved-recipe.model.js';
import type { RecipeCollectionInput } from '../schemas/recipe-collection.schema.js';
import type { ListSavedRecipesQuery } from '../schemas/recipe.schema.js';
import { listSavedRecipes, type PaginatedSavedRecipes } from './saved-recipe.service.js';

export interface PublicRecipeCollection {
  id: string;
  name: string;
  description: string | null;
  recipeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeCollectionMembership extends PublicRecipeCollection {
  containsRecipe: boolean;
}

type CollectionAggregation = PublicRecipeCollection;

const collectionLimit = 30;

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function normalizedName(name: string): string {
  return name.toLocaleLowerCase('en-US');
}

function duplicateNameError(error?: unknown): AppError {
  return new AppError(
    409,
    'COLLECTION_NAME_EXISTS',
    'A collection with that name already exists.',
    error === undefined ? undefined : { cause: error },
  );
}

function toPublicCollection(
  collection: RecipeCollection & { id: string },
  recipeCount = 0,
): PublicRecipeCollection {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    recipeCount,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

function collectionListPipeline(userId: Types.ObjectId): PipelineStage[] {
  return [
    { $match: { user: userId } },
    { $sort: { updatedAt: -1, _id: -1 } },
    {
      $lookup: {
        from: 'saved_recipes',
        let: { collectionId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$user', userId] },
                  { $in: ['$$collectionId', { $ifNull: ['$collections', []] }] },
                ],
              },
            },
          },
          { $lookup: { from: 'recipes', localField: 'recipe', foreignField: '_id', as: 'recipe' } },
          { $unwind: '$recipe' },
          { $match: { 'recipe.status': 'published' } },
          { $count: 'total' },
        ],
        as: 'recipeMetadata',
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        description: 1,
        recipeCount: { $ifNull: [{ $arrayElemAt: ['$recipeMetadata.total', 0] }, 0] },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];
}

export async function listRecipeCollections(userId: string): Promise<PublicRecipeCollection[]> {
  return RecipeCollectionModel.aggregate<CollectionAggregation>(
    collectionListPipeline(new Types.ObjectId(userId)),
  );
}

export async function createRecipeCollection(
  userId: string,
  input: RecipeCollectionInput,
): Promise<PublicRecipeCollection> {
  const user = new Types.ObjectId(userId);
  const collectionCount = await RecipeCollectionModel.countDocuments({ user });
  if (collectionCount >= collectionLimit) {
    throw new AppError(
      409,
      'COLLECTION_LIMIT_REACHED',
      `You can create up to ${collectionLimit} recipe collections.`,
    );
  }

  try {
    const collection = await RecipeCollectionModel.create({
      user,
      name: input.name,
      normalizedName: normalizedName(input.name),
      description: input.description,
    });
    return toPublicCollection(collection);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw duplicateNameError(error);
    throw error;
  }
}

export async function updateRecipeCollection(
  userId: string,
  collectionId: string,
  input: RecipeCollectionInput,
): Promise<PublicRecipeCollection> {
  try {
    const collection = await RecipeCollectionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(collectionId), user: new Types.ObjectId(userId) },
      {
        $set: {
          name: input.name,
          normalizedName: normalizedName(input.name),
          description: input.description,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (collection === null) {
      throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Recipe collection was not found.');
    }
    return toPublicCollection(collection);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw duplicateNameError(error);
    throw error;
  }
}

export async function deleteRecipeCollection(userId: string, collectionId: string): Promise<void> {
  const user = new Types.ObjectId(userId);
  const collection = new Types.ObjectId(collectionId);
  const session = await startSession();

  try {
    await session.withTransaction(async () => {
      const deleted = await RecipeCollectionModel.findOneAndDelete(
        { _id: collection, user },
        { session },
      );
      if (deleted === null) {
        throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Recipe collection was not found.');
      }
      await SavedRecipeModel.updateMany(
        { user, collections: collection },
        { $pull: { collections: collection } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

export async function listCollectionRecipes(
  userId: string,
  collectionId: string,
  query: ListSavedRecipesQuery,
): Promise<{ collection: PublicRecipeCollection; recipes: PaginatedSavedRecipes }> {
  const user = new Types.ObjectId(userId);
  const collectionObjectId = new Types.ObjectId(collectionId);
  const [collection] = await RecipeCollectionModel.aggregate<CollectionAggregation>([
    { $match: { _id: collectionObjectId, user } },
    ...collectionListPipeline(user).slice(1),
  ]);
  if (collection === undefined) {
    throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Recipe collection was not found.');
  }

  const recipes = await listSavedRecipes(userId, query, collectionId);
  return { collection, recipes };
}

export async function addRecipeToCollection(
  userId: string,
  collectionId: string,
  recipeId: string,
): Promise<void> {
  const user = new Types.ObjectId(userId);
  const collection = new Types.ObjectId(collectionId);
  const recipe = new Types.ObjectId(recipeId);
  const [ownedCollection, publishedRecipe] = await Promise.all([
    RecipeCollectionModel.exists({ _id: collection, user }),
    RecipeModel.exists({ _id: recipe, status: 'published' }),
  ]);

  if (ownedCollection === null) {
    throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Recipe collection was not found.');
  }
  if (publishedRecipe === null) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe was not found.');
  }

  await SavedRecipeModel.updateOne(
    { user, recipe },
    {
      $setOnInsert: { user, recipe },
      $addToSet: { collections: collection },
    },
    { upsert: true },
  );
}

export async function removeRecipeFromCollection(
  userId: string,
  collectionId: string,
  recipeId: string,
): Promise<void> {
  const user = new Types.ObjectId(userId);
  const collection = new Types.ObjectId(collectionId);
  const ownedCollection = await RecipeCollectionModel.exists({ _id: collection, user });
  if (ownedCollection === null) {
    throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Recipe collection was not found.');
  }

  await SavedRecipeModel.updateOne(
    { user, recipe: new Types.ObjectId(recipeId) },
    { $pull: { collections: collection } },
  );
}

export async function listRecipeCollectionMemberships(
  userId: string,
  recipeId: string,
): Promise<RecipeCollectionMembership[]> {
  const user = new Types.ObjectId(userId);
  const recipe = new Types.ObjectId(recipeId);
  const [collections, savedRecipe] = await Promise.all([
    listRecipeCollections(userId),
    SavedRecipeModel.findOne({ user, recipe }).select('collections'),
  ]);
  const memberships = new Set(savedRecipe?.collections.map((id) => id.toString()) ?? []);

  return collections.map((collection) => ({
    ...collection,
    containsRecipe: memberships.has(collection.id),
  }));
}
