import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteManagedImageAfterPersistenceMock, deleteRecipeMock } = vi.hoisted(() => ({
  deleteManagedImageAfterPersistenceMock: vi.fn(),
  deleteRecipeMock: vi.fn(),
}));

vi.mock('../../src/services/media.service.js', () => ({
  deleteManagedImageAfterPersistence: deleteManagedImageAfterPersistenceMock,
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    findOneAndDelete: deleteRecipeMock,
  },
}));

import { deleteRecipe } from '../../src/services/recipe.service.js';

const recipeId = '507f1f77bcf86cd799439012';
const authorId = '507f1f77bcf86cd799439011';

describe('recipe deletion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deletes a recipe owned by the current user', async () => {
    deleteRecipeMock.mockResolvedValue({ id: recipeId });

    await expect(
      deleteRecipe(recipeId, { userId: authorId, role: 'user' }),
    ).resolves.toBeUndefined();
    expect(deleteRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
      author: new Types.ObjectId(authorId),
    });
  });

  it('allows an administrator to delete without an ownership filter', async () => {
    deleteRecipeMock.mockResolvedValue({ id: recipeId });

    await deleteRecipe(recipeId, {
      userId: '507f1f77bcf86cd799439013',
      role: 'admin',
    });

    expect(deleteRecipeMock).toHaveBeenCalledWith({
      _id: new Types.ObjectId(recipeId),
    });
  });

  it('removes the cover of a deleted recipe', async () => {
    deleteRecipeMock.mockResolvedValue({
      id: recipeId,
      imagePublicId: `claypot/recipes/${authorId}/cover-id`,
    });

    await deleteRecipe(recipeId, { userId: authorId, role: 'user' });

    expect(deleteManagedImageAfterPersistenceMock).toHaveBeenCalledWith(
      `claypot/recipes/${authorId}/cover-id`,
    );
  });

  it('does not reveal recipes outside the current user ownership', async () => {
    deleteRecipeMock.mockResolvedValue(null);

    await expect(deleteRecipe(recipeId, { userId: authorId, role: 'user' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });
});
