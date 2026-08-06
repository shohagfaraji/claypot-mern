import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateRecipesMock } = vi.hoisted(() => ({
  aggregateRecipesMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    aggregate: aggregateRecipesMock,
  },
}));

import { getPublishedRecipeBySlug } from '../../src/services/recipe.service.js';

describe('published recipe detail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a complete published recipe', async () => {
    const recipe = {
      id: 'recipe-id',
      title: 'Spiced Claypot Rice',
      slug: 'spiced-claypot-rice',
      summary: 'A comforting rice dish cooked with warming spices.',
      imageUrl: null,
      ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
      instructions: [{ step: 1, description: 'Rinse the rice thoroughly.' }],
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      totalTimeMinutes: 55,
      servings: 4,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice'],
      publishedAt: new Date('2026-08-05T08:00:00.000Z'),
      createdAt: new Date('2026-08-04T08:00:00.000Z'),
      updatedAt: new Date('2026-08-05T08:00:00.000Z'),
      author: {
        id: 'user-id',
        name: 'Amina Rahman',
        username: 'amina_kitchen',
        avatarUrl: null,
      },
    };

    aggregateRecipesMock.mockResolvedValue([recipe]);

    await expect(getPublishedRecipeBySlug('spiced-claypot-rice')).resolves.toEqual(recipe);

    const pipeline = aggregateRecipesMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

    expect(pipeline[0]).toEqual({
      $match: {
        slug: 'spiced-claypot-rice',
        status: 'published',
      },
    });
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'users' }),
        }),
      ]),
    );
  });

  it('does not expose missing or unpublished recipes', async () => {
    aggregateRecipesMock.mockResolvedValue([]);

    await expect(getPublishedRecipeBySlug('missing-recipe')).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });
});
