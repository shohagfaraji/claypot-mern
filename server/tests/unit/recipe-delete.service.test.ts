import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteManagedImageAfterPersistenceMock,
  deleteReportsMock,
  deleteRecipeMock,
  deleteReviewsMock,
  deleteSavedRecipesMock,
  endSessionMock,
  startSessionMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  deleteManagedImageAfterPersistenceMock: vi.fn(),
  deleteReportsMock: vi.fn(),
  deleteRecipeMock: vi.fn(),
  deleteReviewsMock: vi.fn(),
  deleteSavedRecipesMock: vi.fn(),
  endSessionMock: vi.fn(),
  startSessionMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('mongoose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('mongoose')>()),
  startSession: startSessionMock,
}));

vi.mock('../../src/services/media.service.js', () => ({
  deleteManagedImageAfterPersistence: deleteManagedImageAfterPersistenceMock,
}));

vi.mock('../../src/models/content-report.model.js', () => ({
  ContentReportModel: { deleteMany: deleteReportsMock },
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    findOneAndDelete: deleteRecipeMock,
  },
}));

vi.mock('../../src/models/review.model.js', () => ({
  ReviewModel: {
    deleteMany: deleteReviewsMock,
  },
}));

vi.mock('../../src/models/saved-recipe.model.js', () => ({
  SavedRecipeModel: {
    deleteMany: deleteSavedRecipesMock,
  },
}));

import { deleteRecipe } from '../../src/services/recipe.service.js';

const recipeId = '507f1f77bcf86cd799439012';
const authorId = '507f1f77bcf86cd799439011';

describe('recipe deletion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation: () => Promise<void>) => operation());
    deleteReviewsMock.mockResolvedValue({ deletedCount: 0 });
    deleteReportsMock.mockResolvedValue({ deletedCount: 0 });
    deleteSavedRecipesMock.mockResolvedValue({ deletedCount: 0 });
  });

  it('deletes a recipe owned by the current user', async () => {
    deleteRecipeMock.mockResolvedValue({ id: recipeId });

    await expect(
      deleteRecipe(recipeId, { userId: authorId, role: 'user' }),
    ).resolves.toBeUndefined();
    expect(deleteRecipeMock).toHaveBeenCalledWith(
      {
        _id: new Types.ObjectId(recipeId),
        author: new Types.ObjectId(authorId),
      },
      { session: expect.any(Object) },
    );
  });

  it('allows an administrator to delete without an ownership filter', async () => {
    deleteRecipeMock.mockResolvedValue({ id: recipeId });

    await deleteRecipe(recipeId, {
      userId: '507f1f77bcf86cd799439013',
      role: 'admin',
    });

    expect(deleteRecipeMock).toHaveBeenCalledWith(
      {
        _id: new Types.ObjectId(recipeId),
      },
      { session: expect.any(Object) },
    );
  });

  it('removes reviews and saved references in the recipe transaction', async () => {
    deleteRecipeMock.mockResolvedValue({ id: recipeId, imagePublicId: null });

    await deleteRecipe(recipeId, { userId: authorId, role: 'user' });

    const recipe = new Types.ObjectId(recipeId);
    expect(deleteReportsMock).toHaveBeenCalledWith({ recipe }, { session: expect.any(Object) });
    expect(deleteReviewsMock).toHaveBeenCalledWith({ recipe }, { session: expect.any(Object) });
    expect(deleteSavedRecipesMock).toHaveBeenCalledWith(
      { recipe },
      { session: expect.any(Object) },
    );
    expect(deleteRecipeMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteReviewsMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(deleteReviewsMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSavedRecipesMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(withTransactionMock).toHaveBeenCalledOnce();
    expect(endSessionMock).toHaveBeenCalledOnce();
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
    expect(endSessionMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteManagedImageAfterPersistenceMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does not reveal recipes outside the current user ownership', async () => {
    deleteRecipeMock.mockResolvedValue(null);

    await expect(deleteRecipe(recipeId, { userId: authorId, role: 'user' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
    expect(deleteReviewsMock).not.toHaveBeenCalled();
    expect(deleteSavedRecipesMock).not.toHaveBeenCalled();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });
});
