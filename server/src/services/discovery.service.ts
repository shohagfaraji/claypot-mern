import type { PipelineStage } from 'mongoose';
import { RecipeModel } from '../models/recipe.model.js';
import { UserModel } from '../models/user.model.js';
import type { ListCooksQuery } from '../schemas/discovery.schema.js';

export interface DiscoveryFacet {
  value: string;
  count: number;
}

export interface RecipeDiscoveryFacets {
  cuisines: DiscoveryFacet[];
  categories: DiscoveryFacet[];
  tags: DiscoveryFacet[];
}

export interface PublicCookListItem {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  publishedRecipeCount: number;
  followerCount: number;
  createdAt: Date;
}

export interface PaginatedCooks {
  items: PublicCookListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type FacetAggregation = RecipeDiscoveryFacets;

interface CookAggregation {
  items: PublicCookListItem[];
  metadata: Array<{ total: number }>;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textFacetPipeline(field: 'category' | 'cuisine'): PipelineStage.FacetPipelineStage[] {
  return [
    {
      $group: {
        _id: { $toLower: `$${field}` },
        value: { $first: `$${field}` },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, value: 1 } },
    { $limit: 24 },
    { $project: { _id: 0, value: 1, count: 1 } },
  ];
}

export async function getRecipeDiscoveryFacets(): Promise<RecipeDiscoveryFacets> {
  const [result] = await RecipeModel.aggregate<FacetAggregation>([
    { $match: { status: 'published' } },
    {
      $facet: {
        cuisines: textFacetPipeline('cuisine'),
        categories: textFacetPipeline('category'),
        tags: [
          { $unwind: '$tags' },
          { $group: { _id: '$tags', value: { $first: '$tags' }, count: { $sum: 1 } } },
          { $sort: { count: -1, value: 1 } },
          { $limit: 30 },
          { $project: { _id: 0, value: 1, count: 1 } },
        ],
      },
    },
  ]);

  return result ?? { cuisines: [], categories: [], tags: [] };
}

function getCookSort(sort: ListCooksQuery['sort']): Record<string, 1 | -1> {
  const sorts: Record<ListCooksQuery['sort'], Record<string, 1 | -1>> = {
    popular: { followerCount: -1, publishedRecipeCount: -1, createdAt: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    name: { sortName: 1, _id: 1 },
  };
  return sorts[sort];
}

export async function listDiscoverableCooks(query: ListCooksQuery): Promise<PaginatedCooks> {
  const match: Record<string, unknown> = {};
  if (query.search !== undefined) {
    const search = new RegExp(escapeRegularExpression(query.search), 'i');
    match.$or = [{ name: search }, { username: search }, { bio: search }];
  }

  const skip = (query.page - 1) * query.limit;
  const [result] = await UserModel.aggregate<CookAggregation>([
    { $match: match },
    {
      $lookup: {
        from: 'recipes',
        let: { authorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$author', '$$authorId'] }, { $eq: ['$status', 'published'] }],
              },
            },
          },
          { $count: 'total' },
        ],
        as: 'recipeMetadata',
      },
    },
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'following',
        pipeline: [{ $count: 'total' }],
        as: 'followerMetadata',
      },
    },
    {
      $set: {
        publishedRecipeCount: {
          $ifNull: [{ $arrayElemAt: ['$recipeMetadata.total', 0] }, 0],
        },
        followerCount: { $ifNull: [{ $arrayElemAt: ['$followerMetadata.total', 0] }, 0] },
        sortName: { $toLower: '$name' },
      },
    },
    { $match: { publishedRecipeCount: { $gt: 0 } } },
    { $sort: getCookSort(query.sort) },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: query.limit },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              name: 1,
              username: 1,
              avatarUrl: 1,
              bio: 1,
              publishedRecipeCount: 1,
              followerCount: 1,
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
