import { describe, expect, it } from 'vitest';
import { createRecipeInputSchema } from '../../src/schemas/recipe.schema.js';

const validRecipeInput = {
  title: '  Spiced Claypot Rice  ',
  summary: '  A comforting rice dish cooked with warming spices.  ',
  imageUrl: 'https://images.example.com/claypot-rice.jpg',
  ingredients: [
    {
      name: '  Basmati rice  ',
      quantity: '  2 cups  ',
    },
  ],
  instructions: [
    {
      description: '  Rinse the rice until the water runs clear.  ',
    },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 40,
  servings: 4,
  difficulty: 'medium',
  cuisine: '  South Asian  ',
  category: '  Main course  ',
  tags: ['  Rice  ', 'Comfort Food', 'rice'],
};

describe('create recipe input schema', () => {
  it('accepts and normalizes valid recipe input', () => {
    expect(createRecipeInputSchema.parse(validRecipeInput)).toEqual({
      title: 'Spiced Claypot Rice',
      summary: 'A comforting rice dish cooked with warming spices.',
      imageUrl: 'https://images.example.com/claypot-rice.jpg',
      ingredients: [
        {
          name: 'Basmati rice',
          quantity: '2 cups',
        },
      ],
      instructions: [
        {
          description: 'Rinse the rice until the water runs clear.',
        },
      ],
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      servings: 4,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
    });
  });

  it('applies optional field defaults', () => {
    const requiredInput: Partial<typeof validRecipeInput> = structuredClone(validRecipeInput);
    delete requiredInput.imageUrl;
    delete requiredInput.tags;
    const result = createRecipeInputSchema.parse(requiredInput);

    expect(result.imageUrl).toBeUndefined();
    expect(result.tags).toEqual([]);
  });

  it('requires recipe ingredients and instructions', () => {
    const result = createRecipeInputSchema.safeParse({
      ...validRecipeInput,
      ingredients: [],
      instructions: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['ingredients', 'instructions']),
    );
  });

  it('rejects invalid timing, serving, difficulty, and image values', () => {
    const result = createRecipeInputSchema.safeParse({
      ...validRecipeInput,
      imageUrl: 'not-a-url',
      prepTimeMinutes: -1,
      cookTimeMinutes: 1.5,
      servings: 101,
      difficulty: 'expert',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([
        'imageUrl',
        'prepTimeMinutes',
        'cookTimeMinutes',
        'servings',
        'difficulty',
      ]),
    );
  });

  it('rejects server-controlled recipe fields', () => {
    const result = createRecipeInputSchema.safeParse({
      ...validRecipeInput,
      author: '507f1f77bcf86cd799439011',
      slug: 'forced-slug',
      status: 'published',
      instructions: [
        {
          step: 99,
          description: 'Rinse the rice until the water runs clear.',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
        }),
      ]),
    );
  });

  it('requires a delivery URL with a managed image public ID', () => {
    const result = createRecipeInputSchema.safeParse({
      ...validRecipeInput,
      imageUrl: null,
      imagePublicId: 'claypot/recipes/user-id/recipe-id',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['imageUrl'] }));
  });
});
