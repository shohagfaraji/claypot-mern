import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteManagedImageAfterPersistenceMock, findRecipeMock } = vi.hoisted(() => ({
  deleteManagedImageAfterPersistenceMock: vi.fn(),
  findRecipeMock: vi.fn(),
}));

vi.mock('../../src/services/media.service.js', () => ({
  deleteManagedImageAfterPersistence: deleteManagedImageAfterPersistenceMock,
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    findOne: findRecipeMock,
  },
}));

import { getAuthorRecipe, updateRecipe } from '../../src/services/recipe.service.js';

const recipeId = '507f1f77bcf86cd799439012';
const authorId = '507f1f77bcf86cd799439011';

const updateInput = {
  title: 'Updated Claypot Rice',
  summary: 'An updated comforting rice dish with warming spices.',
  imageUrl: 'https://images.example.com/updated-rice.jpg',
  imagePublicId: `claypot/recipes/${authorId}/updated-rice`,
  ingredients: [
    { name: 'Basmati rice', quantity: '2 cups' },
    { name: 'Whole spices', quantity: '1 tbsp' },
  ],
  instructions: [
    { description: 'Rinse the rice until the water runs clear.' },
    { description: 'Cook the rice gently with the whole spices.' },
  ],
  prepTimeMinutes: 20,
  cookTimeMinutes: 45,
  servings: 6,
  difficulty: 'medium' as const,
  cuisine: 'South Asian',
  category: 'Main course',
  tags: ['rice', 'comfort food'],
};

function createRecipeDocument(imagePublicId: string | null = null) {
  return {
    id: recipeId,
    author: new Types.ObjectId(authorId),
    title: 'Spiced Claypot Rice',
    slug: 'spiced-claypot-rice',
    summary: 'A comforting rice dish cooked with warming spices.',
    imageUrl: null,
    imagePublicId,
    ingredients: [{ name: 'Basmati rice', quantity: '2 cups' }],
    instructions: [{ step: 1, description: 'Rinse the rice thoroughly.' }],
    prepTimeMinutes: 15,
    cookTimeMinutes: 40,
    servings: 4,
    difficulty: 'medium' as const,
    cuisine: 'South Asian',
    category: 'Main course',
    tags: ['rice'],
    status: 'draft' as const,
    publishedAt: null,
    createdAt: new Date('2026-08-04T08:00:00.000Z'),
    updatedAt: new Date('2026-08-04T08:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('author recipe editing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the complete recipe owned by the current user', async () => {
    const recipe = createRecipeDocument();
    findRecipeMock.mockResolvedValue(recipe);

    await expect(
      getAuthorRecipe(recipeId, { userId: authorId, role: 'user' }),
    ).resolves.toMatchObject({
      id: recipeId,
      slug: 'spiced-claypot-rice',
      ingredients: expect.any(Array),
      instructions: expect.any(Array),
    });
    expect(findRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(authorId),
    });
  });

  it('updates recipe content while preserving publication identity', async () => {
    const recipe = createRecipeDocument();
    findRecipeMock.mockResolvedValue(recipe);

    const result = await updateRecipe(recipeId, { userId: authorId, role: 'user' }, updateInput);

    expect(recipe).toMatchObject({
      title: updateInput.title,
      slug: 'spiced-claypot-rice',
      summary: updateInput.summary,
      imageUrl: updateInput.imageUrl,
      imagePublicId: updateInput.imagePublicId,
      ingredients: updateInput.ingredients,
      instructions: [
        { step: 1, description: updateInput.instructions[0]?.description },
        { step: 2, description: updateInput.instructions[1]?.description },
      ],
      prepTimeMinutes: 20,
      cookTimeMinutes: 45,
      servings: 6,
      status: 'draft',
    });
    expect(recipe.save).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: recipeId, title: updateInput.title });
  });

  it('removes the previous cover after saving its replacement', async () => {
    const recipe = createRecipeDocument(`claypot/recipes/${authorId}/previous-cover`);
    findRecipeMock.mockResolvedValue(recipe);

    await updateRecipe(recipeId, { userId: authorId, role: 'user' }, updateInput);

    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledWith(
      `claypot/recipes/${authorId}/previous-cover`,
    );
    expect(recipe.save.mock.invocationCallOrder[0]).toBeLessThan(
      deleteManagedImageAfterPersistenceMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('allows an administrator to edit without an ownership filter', async () => {
    findRecipeMock.mockResolvedValue(createRecipeDocument());

    await updateRecipe(
      recipeId,
      { userId: '507f1f77bcf86cd799439013', role: 'admin' },
      updateInput,
    );

    expect(findRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
    });
  });

  it('does not reveal recipes outside the current user ownership', async () => {
    findRecipeMock.mockResolvedValue(null);

    await expect(
      updateRecipe(recipeId, { userId: authorId, role: 'user' }, updateInput),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });
});
