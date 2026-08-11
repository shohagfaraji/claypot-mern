import { beforeEach, describe, expect, it, vi } from 'vitest';

const { countRecipesMock, findUserMock, selectUserMock } = vi.hoisted(() => ({
  countRecipesMock: vi.fn(),
  findUserMock: vi.fn(),
  selectUserMock: vi.fn(),
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    countDocuments: countRecipesMock,
  },
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    findOne: findUserMock,
  },
}));

import { getPublicUserId, getPublicUserProfile } from '../../src/services/user-profile.service.js';

describe('public user profile service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findUserMock.mockReturnValue({ select: selectUserMock });
  });

  it('returns public fields and a published recipe count', async () => {
    const createdAt = new Date('2026-07-27T08:00:00.000Z');
    selectUserMock.mockResolvedValue({
      _id: 'user-object-id',
      id: 'user-id',
      name: 'Amina Noor',
      username: 'amina_kitchen',
      avatarUrl: null,
      bio: 'Home cook and recipe collector.',
      createdAt,
    });
    countRecipesMock.mockResolvedValue(7);

    await expect(getPublicUserProfile('amina_kitchen')).resolves.toEqual({
      id: 'user-id',
      name: 'Amina Noor',
      username: 'amina_kitchen',
      avatarUrl: null,
      bio: 'Home cook and recipe collector.',
      createdAt,
      publishedRecipeCount: 7,
    });
    expect(findUserMock).toHaveBeenCalledWith({ username: 'amina_kitchen' });
    expect(selectUserMock).toHaveBeenCalledWith('name username avatarUrl bio createdAt');
    expect(countRecipesMock).toHaveBeenCalledWith({
      author: 'user-object-id',
      status: 'published',
    });
  });

  it('returns only the user ID when loading their recipe collection', async () => {
    selectUserMock.mockResolvedValue({ id: 'user-id' });

    await expect(getPublicUserId('amina_kitchen')).resolves.toBe('user-id');
    expect(selectUserMock).toHaveBeenCalledWith('_id');
    expect(countRecipesMock).not.toHaveBeenCalled();
  });

  it('returns the same not-found response for missing profile resources', async () => {
    selectUserMock.mockResolvedValue(null);

    await expect(getPublicUserProfile('missing_user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
    await expect(getPublicUserId('missing_user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
