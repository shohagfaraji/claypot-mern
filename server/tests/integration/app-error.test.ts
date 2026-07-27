import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

describe('application error responses', () => {
  it('returns the status and public details of an expected error', async () => {
    const app = express();

    app.get('/conflict', () => {
      throw new AppError(409, 'RESOURCE_CONFLICT', 'The resource already exists.');
    });
    app.use(errorHandler);

    const response = await request(app).get('/conflict').expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'The resource already exists.',
      },
    });
  });
});
