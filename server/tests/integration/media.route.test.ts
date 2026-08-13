import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createImageUploadSignatureMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  createImageUploadSignatureMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  createAccessToken: vi.fn(),
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/media.service.js', () => ({
  createImageUploadSignature: createImageUploadSignatureMock,
}));

import { createApp } from '../../src/app.js';

describe('POST /api/v1/media/images/signature', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a controlled signature for an authenticated user', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    createImageUploadSignatureMock.mockReturnValue({
      uploadUrl: 'https://api.cloudinary.com/v1_1/claypot/image/upload',
      signature: 'signed-parameters',
    });

    const response = await request(app)
      .post('/api/v1/media/images/signature')
      .set('Authorization', 'Bearer signed-access-token')
      .send({ purpose: 'recipe-cover' })
      .expect(200);

    expect(createImageUploadSignatureMock).toHaveBeenCalledWith('user-id', 'recipe-cover');
    expect(response.body.data.upload.signature).toBe('signed-parameters');
  });

  it('authenticates before validating upload input', async () => {
    const response = await request(app)
      .post('/api/v1/media/images/signature')
      .send({ purpose: 'banner' })
      .expect(401);

    expect(createImageUploadSignatureMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unsupported image purposes', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });

    const response = await request(app)
      .post('/api/v1/media/images/signature')
      .set('Authorization', 'Bearer signed-access-token')
      .send({ purpose: 'banner' })
      .expect(400);

    expect(createImageUploadSignatureMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
