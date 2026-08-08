import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findRecipeMock } = vi.hoisted(() => ({
  findRecipeMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    findOne: findRecipeMock,
  },
}));

import { publishRecipe } from '../../src/services/recipe.service.js';

const recipeId = '507f1f77bcf86cd799439012';
const authorId = '507f1f77bcf86cd799439011';

function createRecipeDocument(status: 'draft' | 'published' = 'draft') {
  return {
    id: recipeId,
    author: new Types.ObjectId(authorId),
    title: 'Spiced Claypot Rice',
    slug: 'spiced-claypot-rice',
    summary: 'A comforting rice dish cooked with warming spices.',
    imageUrl: null,
    ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
    instructions: [{ step: 1, description: 'Rinse the rice thoroughly.' }],
    prepTimeMinutes: 15,
    cookTimeMinutes: 40,
    servings: 4,
    difficulty: 'medium' as const,
    cuisine: 'South Asian',
    category: 'Main course',
    tags: ['rice'],
    status,
    publishedAt: status === 'published' ? new Date('2026-08-05T08:00:00.000Z') : null,
    createdAt: new Date('2026-08-04T08:00:00.000Z'),
    updatedAt: new Date('2026-08-04T08:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('recipe publishing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('publishes a draft owned by the current user', async () => {
    const recipe = createRecipeDocument();

    findRecipeMock.mockResolvedValue(recipe);

    const result = await publishRecipe(recipeId, {
      userId: authorId,
      role: 'user',
    });

    expect(findRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(authorId),
    });
    expect(recipe.status).toBe('published');
    expect(recipe.publishedAt).toBeInstanceOf(Date);
    expect(recipe.save).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      id: recipeId,
      status: 'published',
    });
  });

  it('allows an administrator to publish without an ownership filter', async () => {
    const recipe = createRecipeDocument();

    findRecipeMock.mockResolvedValue(recipe);

    await publishRecipe(recipeId, {
      userId: '507f1f77bcf86cd799439013',
      role: 'admin',
    });

    expect(findRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
    });
  });

  it('does not change the publication date when repeated', async () => {
    const recipe = createRecipeDocument('published');
    const originalPublishedAt = recipe.publishedAt;

    findRecipeMock.mockResolvedValue(recipe);

    await publishRecipe(recipeId, {
      userId: authorId,
      role: 'user',
    });

    expect(recipe.publishedAt).toBe(originalPublishedAt);
    expect(recipe.save).not.toHaveBeenCalled();
  });

  it('does not reveal recipes outside the current user ownership', async () => {
    findRecipeMock.mockResolvedValue(null);

    await expect(
      publishRecipe(recipeId, {
        userId: authorId,
        role: 'user',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });
});
