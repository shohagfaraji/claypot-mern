import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiSignRequestMock, randomUuidMock } = vi.hoisted(() => ({
  apiSignRequestMock: vi.fn(),
  randomUuidMock: vi.fn(),
}));

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  randomUUID: randomUuidMock,
}));

vi.mock('cloudinary', () => ({
  v2: {
    utils: {
      api_sign_request: apiSignRequestMock,
    },
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: 'claypot-cloud',
    CLOUDINARY_API_KEY: 'public-api-key',
    CLOUDINARY_API_SECRET: 'private-api-secret',
  },
}));

import { createImageUploadSignature } from '../../src/services/media.service.js';

describe('media service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    randomUuidMock.mockReturnValue('019c2f98-77ba-7000-8000-000000000001');
    apiSignRequestMock.mockReturnValue('signed-parameters');
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
});
