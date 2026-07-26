import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

describe('API health', () => {
  const app = createApp();

  it('reports that the API is available', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'claypot-api',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns a consistent response for unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/v1/unknown was not found.',
      },
    });
  });
});
