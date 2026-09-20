import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { aggregate, countDocuments, create, findOne } = vi.hoisted(() => ({
  aggregate: vi.fn(),
  countDocuments: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
}));
vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: { aggregate, countDocuments, create, findOne },
}));
import {
  createRecipe,
  getPublishedRecipeBySlug,
  updateRecipe,
} from '../../src/services/recipe.service.js';
const owner = '507f1f77bcf86cd799439011';
const id = '607f1f77bcf86cd799439011';
const target = '607f1f77bcf86cd799439012';
const input = {
  title: 'Chicken curry',
  summary: 'A warming curry for the dinner table.',
  ingredients: [{ name: 'Chicken', quantity: '500 g' }],
  instructions: [{ description: 'Cook until done.' }],
  prepTimeMinutes: 10,
  cookTimeMinutes: 30,
  servings: 4,
  cuisine: 'Bangladeshi',
  category: 'Main course',
  difficulty: 'easy' as const,
  tags: [],
};
beforeEach(() => vi.resetAllMocks());
describe('recipe pairings', () => {
  it('rejects unavailable targets before creating a recipe', async () => {
    countDocuments.mockResolvedValue(0);
    await expect(
      createRecipe(owner, { ...input, pairings: [{ recipeId: target, label: 'Side dish' }] }),
    ).rejects.toMatchObject({ code: 'INVALID_RECIPE_PAIRING' });
    expect(create).not.toHaveBeenCalled();
    expect(countDocuments).toHaveBeenCalledWith({
      _id: { $in: [new Types.ObjectId(target)] },
      status: 'published',
    });
  });
  it('persists a published pairing on creation', async () => {
    countDocuments.mockResolvedValue(1);
    create.mockImplementation(async (record) => ({ ...record, id }));
    expect(
      (
        await createRecipe(owner, {
          ...input,
          pairings: [{ recipeId: target, label: 'Side dish' }],
        })
      ).pairings,
    ).toEqual([{ recipeId: target, label: 'Side dish' }]);
  });
  it('rejects self-links and checks ownership before target validation', async () => {
    const save = vi.fn();
    findOne.mockResolvedValue({ author: new Types.ObjectId(owner), save });
    await expect(
      updateRecipe(
        id,
        { userId: owner, role: 'user' },
        { ...input, pairings: [{ recipeId: id, label: 'Related recipe' }] },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RECIPE_PAIRING' });
    expect(save).not.toHaveBeenCalled();
    findOne.mockResolvedValue(null);
    await expect(
      updateRecipe(
        id,
        { userId: owner, role: 'user' },
        { ...input, pairings: [{ recipeId: target, label: 'Side dish' }] },
      ),
    ).rejects.toMatchObject({ code: 'RECIPE_NOT_FOUND' });
    expect(countDocuments).not.toHaveBeenCalled();
  });
  it('preserves omitted pairings and clears an explicitly empty list', async () => {
    const recipe = {
      ...input,
      id,
      author: new Types.ObjectId(owner),
      pairings: [{ recipe: new Types.ObjectId(target), label: 'Side dish' }],
      save: vi.fn(),
    };
    findOne.mockResolvedValue(recipe);
    await updateRecipe(id, { userId: owner, role: 'user' }, input);
    expect(recipe.pairings).toHaveLength(1);
    await updateRecipe(id, { userId: owner, role: 'user' }, { ...input, pairings: [] });
    expect(recipe.pairings).toEqual([]);
  });
  it('resolves published suggestions without exposing raw references', async () => {
    aggregate
      .mockResolvedValueOnce([
        {
          id,
          pairings: [
            { recipe: new Types.ObjectId(target), label: 'Side dish' },
            { recipe: new Types.ObjectId('607f1f77bcf86cd799439013'), label: 'Dessert' },
          ],
        },
      ])
      .mockResolvedValueOnce([{ id: target, title: 'Naan', slug: 'naan' }]);
    const result = await getPublishedRecipeBySlug('chicken-curry');
    expect(result.pairedRecipes).toEqual([
      { id: target, title: 'Naan', slug: 'naan', label: 'Side dish' },
    ]);
    expect(result).not.toHaveProperty('pairings');
    expect(aggregate.mock.calls[1]?.[0][0].$match.status).toBe('published');
  });
});
