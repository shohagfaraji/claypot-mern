import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const { registerUserMock } = vi.hoisted(() => ({
  registerUserMock: vi.fn(),
}));

vi.mock('../../src/services/auth.service.js', () => ({
  registerUser: registerUserMock,
}));

import { createApp } from '../../src/app.js';

const registrationBody = {
  name: '  Amina Rahman  ',
  username: '  Amina_Kitchen  ',
  email: '  AMINA@EXAMPLE.COM  ',
  password: 'Claypot9',
};

describe('POST /api/v1/auth/register', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates an account from normalized input', async () => {
    registerUserMock.mockResolvedValue({
      id: 'user-id',
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      avatarUrl: null,
      bio: null,
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registrationBody)
      .expect(201);

    expect(registerUserMock).toHaveBeenCalledWith({
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      password: 'Claypot9',
    });
    expect(response.body).toEqual({
      data: {
        user: {
          id: 'user-id',
          name: 'Amina Rahman',
          username: 'amina_kitchen',
          email: 'amina@example.com',
          avatarUrl: null,
          bio: null,
          role: 'user',
          isEmailVerified: false,
          createdAt: '2026-07-27T08:00:00.000Z',
        },
      },
    });
    expect(response.body).not.toHaveProperty('data.user.password');
    expect(response.body).not.toHaveProperty('data.user.passwordHash');
  });

  it('rejects invalid input before calling the service', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...registrationBody,
        email: 'invalid-email',
      })
      .expect(400);

    expect(registerUserMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a conflict when the account already exists', async () => {
    registerUserMock.mockRejectedValue(
      new AppError(
        409,
        'ACCOUNT_ALREADY_EXISTS',
        'An account with that email or username already exists.',
      ),
    );

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registrationBody)
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'An account with that email or username already exists.',
      },
    });
  });
});
