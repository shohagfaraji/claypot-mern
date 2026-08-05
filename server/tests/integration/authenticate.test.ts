import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessTokenMock } = vi.hoisted(() => ({
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { authenticate } from '../../src/middleware/authenticate.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

function createProtectedApp() {
  const app = express();

  app.get('/protected', authenticate, (request, response) => {
    response.status(200).json({
      data: {
        identity: request.auth,
      },
    });
  });
  app.use(errorHandler);

  return app;
}

describe('access token authentication', () => {
  const app = createProtectedApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('attaches a verified identity to the request', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      role: 'user',
    });

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(200);

    expect(verifyAccessTokenMock).toHaveBeenCalledWith('signed-access-token');
    expect(response.body).toEqual({
      data: {
        identity: {
          userId: '507f1f77bcf86cd799439011',
          role: 'user',
        },
      },
    });
  });

  it.each([
    ['a missing header', undefined],
    ['the wrong scheme', 'Basic credentials'],
    ['a missing token', 'Bearer'],
    ['additional credentials', 'Bearer token extra'],
  ])('rejects %s', async (_case, authorizationHeader) => {
    const pendingRequest = request(app).get('/protected');

    if (authorizationHeader !== undefined) {
      pendingRequest.set('Authorization', authorizationHeader);
    }

    const response = await pendingRequest.expect(401);

    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      },
    });
  });

  it('rejects an invalid or expired token', async () => {
    verifyAccessTokenMock.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      },
    });
  });
});
