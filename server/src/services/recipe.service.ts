import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { createSlugBase } from '../lib/slug.js';
import { RecipeModel, type Recipe } from '../models/recipe.model.js';
import type { CreateRecipeInput } from '../schemas/recipe.schema.js';

const maximumCreateAttempts = 3;

export interface PublicRecipe extends Omit<Recipe, 'author'> {
  id: string;
  author: string;
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
