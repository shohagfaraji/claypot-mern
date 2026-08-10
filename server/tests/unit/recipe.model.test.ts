import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { RecipeModel } from '../../src/models/recipe.model.js';

function createValidRecipe() {
  return new RecipeModel({
    author: new Types.ObjectId(),
    title: '  Spiced Claypot Rice  ',
    slug: 'spiced-claypot-rice',
    summary: '  A comforting rice dish cooked with warming spices.  ',
    ingredients: [
      {
        name: '  Basmati rice  ',
        quantity: '  2 cups  ',
      },
    ],
    instructions: [
      {
        step: 1,
        description: '  Rinse the rice until the water runs clear.  ',
      },
    ],
    prepTimeMinutes: 15,
    cookTimeMinutes: 40,
    servings: 4,
    difficulty: 'medium',
    cuisine: '  South Asian  ',
    category: '  Main course  ',
    tags: ['  Rice  ', 'Comfort Food'],
  });
}

describe('Recipe model', () => {
  it('accepts a complete recipe and normalizes its text fields', async () => {
    const recipe = createValidRecipe();

    await expect(recipe.validate()).resolves.toBeUndefined();
    expect(recipe.title).toBe('Spiced Claypot Rice');
    expect(recipe.summary).toBe('A comforting rice dish cooked with warming spices.');
    expect(recipe.ingredients[0]?.name).toBe('Basmati rice');
    expect(recipe.instructions[0]?.description).toBe('Rinse the rice until the water runs clear.');
    expect(recipe.tags).toEqual(['rice', 'comfort food']);
    expect(recipe.status).toBe('draft');
    expect(recipe.imageUrl).toBeNull();
    expect(recipe.publishedAt).toBeNull();
  });

  it('requires recipe content and preparation details', async () => {
    const recipe = new RecipeModel({});

    await expect(recipe.validate()).rejects.toMatchObject({
      errors: {
        author: expect.any(Object),
        title: expect.any(Object),
        slug: expect.any(Object),
        summary: expect.any(Object),
        ingredients: expect.any(Object),
        instructions: expect.any(Object),
        prepTimeMinutes: expect.any(Object),
        cookTimeMinutes: expect.any(Object),
        servings: expect.any(Object),
        difficulty: expect.any(Object),
        cuisine: expect.any(Object),
        category: expect.any(Object),
      },
    });
  });

  it('rejects invalid limits and unsupported values', async () => {
    const recipe = createValidRecipe();

    recipe.slug = 'Invalid Slug';
    recipe.prepTimeMinutes = -1;
    recipe.servings = 101;
    recipe.set('difficulty', 'expert');
    recipe.tags = Array.from({ length: 11 }, (_, index) => `tag-${index + 1}`);

    await expect(recipe.validate()).rejects.toMatchObject({
      errors: {
        slug: expect.any(Object),
        prepTimeMinutes: expect.any(Object),
        servings: expect.any(Object),
        difficulty: expect.any(Object),
        tags: expect.any(Object),
      },
    });
  });

  it('enforces content limits when recipes are written outside the HTTP layer', async () => {
    const recipe = createValidRecipe();

    recipe.ingredients = Array.from({ length: 51 }, () => ({
      name: 'Basmati rice',
      quantity: '1 cup',
    }));
    recipe.instructions = Array.from({ length: 51 }, (_, index) => ({
      step: index + 1,
      description: 'Cook the rice until tender.',
    }));
    recipe.cuisine = 'A';
    recipe.category = 'B';

    await expect(recipe.validate()).rejects.toMatchObject({
      errors: {
        ingredients: expect.any(Object),
        instructions: expect.any(Object),
        cuisine: expect.any(Object),
        category: expect.any(Object),
      },
    });
  });
});
