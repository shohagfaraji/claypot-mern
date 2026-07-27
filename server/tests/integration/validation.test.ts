import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { validateBody } from '../../src/middleware/validate-request.js';
import { registerInputSchema } from '../../src/schemas/auth.schema.js';

function createValidationApp() {
  const app = express();

  app.use(express.json());
  app.post('/register', validateBody(registerInputSchema), (request, response) => {
    response.status(200).json(request.body);
  });
  app.use(errorHandler);

  return app;
}

describe('request validation', () => {
  const app = createValidationApp();

  it('passes normalized input to the next handler', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        name: '  Amina Rahman  ',
        username: '  Amina_Kitchen  ',
        email: '  AMINA@EXAMPLE.COM  ',
        password: 'Claypot9',
      })
      .expect(200);

    expect(response.body).toEqual({
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      password: 'Claypot9',
    });
  });

  it('returns field-level details for invalid input', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        name: 'A',
        username: '_invalid_user_',
        email: 'invalid-email',
        password: 'weak',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: expect.arrayContaining([
          {
            field: 'name',
            message: expect.any(String),
          },
          {
            field: 'username',
            message: expect.any(String),
          },
          {
            field: 'email',
            message: expect.any(String),
          },
          {
            field: 'password',
            message: expect.any(String),
          },
        ]),
      },
    });
  });

  it('rejects fields outside the public registration contract', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        name: 'Amina Rahman',
        username: 'amina_kitchen',
        email: 'amina@example.com',
        password: 'Claypot9',
        role: 'admin',
      })
      .expect(400);

    expect(response.body.error.details).toContainEqual({
      field: 'body',
      message: expect.stringContaining('role'),
    });
  });
});
