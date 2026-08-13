import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRecipeDocumentMock } = vi.hoisted(() => ({
  createRecipeDocumentMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    create: createRecipeDocumentMock,
  },
}));

import { createRecipe } from '../../src/services/recipe.service.js';

const authorId = '507f1f77bcf86cd799439011';
const recipeInput = {
  title: 'Spiced Claypot Rice',
  summary: 'A comforting rice dish cooked with warming spices.',
  ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
  instructions: [
    { description: 'Rinse the rice until the water runs clear.' },
    { description: 'Cook the rice with the spices until tender.' },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 40,
  servings: 4,
  difficulty: 'medium' as const,
  cuisine: 'South Asian',
  category: 'Main course',
  tags: ['rice', 'comfort food'],
};

function createRecipeDocument(slug: string) {
  return {
    id: 'recipe-id',
    author: new Types.ObjectId(authorId),
    ...recipeInput,
    slug,
    imageUrl: null,
    imagePublicId: null,
    instructions: [
      { step: 1, description: recipeInput.instructions[0]?.description },
      { step: 2, description: recipeInput.instructions[1]?.description },
    ],
    status: 'draft' as const,
    publishedAt: null,
    createdAt: new Date('2026-08-05T08:00:00.000Z'),
    updatedAt: new Date('2026-08-05T08:00:00.000Z'),
  };
}

describe('recipe creation service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates an owned draft with numbered instructions', async () => {
    createRecipeDocumentMock.mockResolvedValue(createRecipeDocument('spiced-claypot-rice'));

    const recipe = await createRecipe(authorId, recipeInput);

    expect(createRecipeDocumentMock).toHaveBeenCalledWith({
      author: new Types.ObjectId(authorId),
      title: recipeInput.title,
      slug: 'spiced-claypot-rice',
      summary: recipeInput.summary,
      imageUrl: null,
      imagePublicId: null,
      ingredients: recipeInput.ingredients,
      instructions: [
        { step: 1, description: recipeInput.instructions[0]?.description },
        { step: 2, description: recipeInput.instructions[1]?.description },
      ],
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      servings: 4,
      difficulty: 'medium',
      cuisine: 'South Asian',
      category: 'Main course',
      tags: ['rice', 'comfort food'],
    });
    expect(recipe).toMatchObject({
      id: 'recipe-id',
      author: authorId,
      slug: 'spiced-claypot-rice',
      status: 'draft',
    });
  });

  it('rejects a managed image outside the recipe owner folder', async () => {
    await expect(
      createRecipe(authorId, {
        ...recipeInput,
        imageUrl: 'https://res.cloudinary.com/claypot/image/upload/recipe.jpg',
        imagePublicId: 'claypot/recipes/another-user/recipe-id',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_ASSET', statusCode: 400 });
    expect(createRecipeDocumentMock).not.toHaveBeenCalled();
  });

  it('adds a suffix and retries a slug collision', async () => {
    createRecipeDocumentMock
      .mockRejectedValueOnce({ code: 11000 })
      .mockImplementationOnce((input: { slug: string }) =>
        Promise.resolve(createRecipeDocument(input.slug)),
      );

    const recipe = await createRecipe(authorId, recipeInput);

    expect(createRecipeDocumentMock).toHaveBeenCalledTimes(2);
    expect(recipe.slug).toMatch(/^spiced-claypot-rice-[a-f0-9]{6}$/);
  });

  it('preserves unexpected persistence failures', async () => {
    const databaseError = new Error('Database unavailable');

    createRecipeDocumentMock.mockRejectedValue(databaseError);

    await expect(createRecipe(authorId, recipeInput)).rejects.toBe(databaseError);
    expect(createRecipeDocumentMock).toHaveBeenCalledOnce();
  });
});
