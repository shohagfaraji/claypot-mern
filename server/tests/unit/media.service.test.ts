import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiSignRequestMock,
  cloudinaryConfigMock,
  destroyImageMock,
  findRecipeImageMock,
  findUserAvatarMock,
  loggerWarnMock,
  randomUuidMock,
} = vi.hoisted(() => ({
  apiSignRequestMock: vi.fn(),
  cloudinaryConfigMock: vi.fn(),
  destroyImageMock: vi.fn(),
  findRecipeImageMock: vi.fn(),
  findUserAvatarMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  randomUuidMock: vi.fn(),
}));

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  randomUUID: randomUuidMock,
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: cloudinaryConfigMock,
    uploader: {
      destroy: destroyImageMock,
    },
    utils: {
      api_sign_request: apiSignRequestMock,
    },
  },
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: {
    warn: loggerWarnMock,
  },
}));

vi.mock('../../src/models/recipe.model.js', () => ({
  RecipeModel: {
    exists: findRecipeImageMock,
  },
}));

vi.mock('../../src/models/user.model.js', () => ({
  UserModel: {
    exists: findUserAvatarMock,
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: 'claypot-cloud',
    CLOUDINARY_API_KEY: 'public-api-key',
    CLOUDINARY_API_SECRET: 'private-api-secret',
  },
}));

import {
  createImageUploadSignature,
  deleteManagedImage,
  deleteManagedImageAfterPersistence,
  discardUnusedImage,
} from '../../src/services/media.service.js';

describe('media service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    randomUuidMock.mockReturnValue('019c2f98-77ba-7000-8000-000000000001');
    apiSignRequestMock.mockReturnValue('signed-parameters');
    destroyImageMock.mockResolvedValue({ result: 'ok' });
    findRecipeImageMock.mockResolvedValue(null);
    findUserAvatarMock.mockResolvedValue(null);
  });

  it.each([
    ['avatar', 'avatars'],
    ['recipe-cover', 'recipes'],
  ] as const)('signs a controlled %s upload', (purpose, folderName) => {
    const upload = createImageUploadSignature(
      '507f1f77bcf86cd799439011',
      purpose,
      new Date('2026-08-13T00:00:00.000Z'),
    );
    const folder = `claypot/${folderName}/507f1f77bcf86cd799439011`;

    expect(apiSignRequestMock).toHaveBeenCalledWith(
      {
        allowed_formats: 'avif,jpeg,jpg,png,webp',
        asset_folder: folder,
        public_id: `${folder}/019c2f98-77ba-7000-8000-000000000001`,
        timestamp: 1_786_579_200,
        transformation: 'c_limit,w_2400,h_2400',
      },
      'private-api-secret',
    );
    expect(upload).toEqual({
      uploadUrl: 'https://api.cloudinary.com/v1_1/claypot-cloud/image/upload',
      cloudName: 'claypot-cloud',
      apiKey: 'public-api-key',
      signature: 'signed-parameters',
      timestamp: 1_786_579_200,
      assetFolder: folder,
      publicId: `${folder}/019c2f98-77ba-7000-8000-000000000001`,
      allowedFormats: 'avif,jpeg,jpg,png,webp',
      transformation: 'c_limit,w_2400,h_2400',
    });
  });

  it('deletes a managed image with cache invalidation', async () => {
    await deleteManagedImage('claypot/recipes/user-id/image-id');

    expect(cloudinaryConfigMock).toHaveBeenCalledWith({
      cloud_name: 'claypot-cloud',
      api_key: 'public-api-key',
      api_secret: 'private-api-secret',
      secure: true,
    });
    expect(destroyImageMock).toHaveBeenCalledWith('claypot/recipes/user-id/image-id', {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    });
  });

  it('discards an unused recipe image owned by the current user', async () => {
    await discardUnusedImage('user-id', {
      purpose: 'recipe-cover',
      publicId: 'claypot/recipes/user-id/image-id',
    });

    expect(findRecipeImageMock).toHaveBeenCalledWith({
      imagePublicId: 'claypot/recipes/user-id/image-id',
    });
    expect(destroyImageMock).toHaveBeenCalledOnce();
  });

  it('checks avatar references before discarding an avatar', async () => {
    await discardUnusedImage('user-id', {
      purpose: 'avatar',
      publicId: 'claypot/avatars/user-id/image-id',
    });

    expect(findUserAvatarMock).toHaveBeenCalledWith({
      avatarPublicId: 'claypot/avatars/user-id/image-id',
    });
    expect(findRecipeImageMock).not.toHaveBeenCalled();
  });

  it('does not reveal or delete images outside the current user namespace', async () => {
    await expect(
      discardUnusedImage('user-id', {
        purpose: 'recipe-cover',
        publicId: 'claypot/recipes/another-user/image-id',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'MEDIA_ASSET_NOT_FOUND' });

    expect(findRecipeImageMock).not.toHaveBeenCalled();
    expect(destroyImageMock).not.toHaveBeenCalled();
  });

  it('protects images that are still referenced by a record', async () => {
    findRecipeImageMock.mockResolvedValue({ _id: 'recipe-id' });

    await expect(
      discardUnusedImage('user-id', {
        purpose: 'recipe-cover',
        publicId: 'claypot/recipes/user-id/image-id',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'MEDIA_ASSET_IN_USE' });

    expect(destroyImageMock).not.toHaveBeenCalled();
  });

  it('keeps a completed database update successful when remote cleanup fails', async () => {
    const cleanupError = new Error('Cloudinary unavailable');
    destroyImageMock.mockRejectedValue(cleanupError);

    await expect(
      deleteManagedImageAfterPersistence('claypot/avatars/user-id/image-id'),
    ).resolves.toBeUndefined();
    expect(loggerWarnMock).toHaveBeenCalledWith(
      { err: cleanupError, publicId: 'claypot/avatars/user-id/image-id' },
      'Cloudinary image cleanup failed',
    );
  });
});
