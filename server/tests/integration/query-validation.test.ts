import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { validateQuery } from '../../src/middleware/validate-request.js';
import { listRecipesQuerySchema } from '../../src/schemas/recipe.schema.js';

function createQueryValidationApp() {
  const app = express();

  app.get('/recipes', validateQuery(listRecipesQuerySchema), (request, response) => {
    response.status(200).json(request.validatedQuery);
  });
  app.use(errorHandler);

  return app;
}

describe('query validation', () => {
  const app = createQueryValidationApp();

  it('passes parsed query data without mutating the Express query object', async () => {
    const response = await request(app)
      .get('/recipes')
      .query({
        page: '2',
        limit: '6',
        tags: 'rice,quick',
      })
      .expect(200);

    expect(response.body).toEqual({
      page: 2,
      limit: 6,
      tags: ['rice', 'quick'],
      sort: 'newest',
    });
  });

  it('returns field details for invalid query parameters', async () => {
    const response = await request(app)
      .get('/recipes')
      .query({
        page: '0',
        sort: 'unsupported',
      })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: expect.arrayContaining([
        expect.objectContaining({ field: 'page' }),
        expect.objectContaining({ field: 'sort' }),
      ]),
    });
  });
});
