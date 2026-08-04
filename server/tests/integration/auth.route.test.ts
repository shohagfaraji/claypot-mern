import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const { authenticateUserMock, createAuthSessionMock, registerUserMock } = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  createAuthSessionMock: vi.fn(),
  registerUserMock: vi.fn(),
}));

vi.mock('../../src/services/auth.service.js', () => ({
  authenticateUser: authenticateUserMock,
  registerUser: registerUserMock,
}));

vi.mock('../../src/services/session.service.js', () => ({
  createAuthSession: createAuthSessionMock,
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
    createAuthSessionMock.mockResolvedValue({
      accessToken: 'signed-access-token',
      refreshToken: 'raw-refresh-token',
      refreshTokenExpiresAt: new Date('2026-08-03T08:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('User-Agent', 'Claypot test browser')
      .send(registrationBody)
      .expect(201);

    expect(registerUserMock).toHaveBeenCalledWith({
      name: 'Amina Rahman',
      username: 'amina_kitchen',
      email: 'amina@example.com',
      password: 'Claypot9',
    });
    expect(createAuthSessionMock).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        role: 'user',
      },
      {
        userAgent: 'Claypot test browser',
        ipAddress: expect.any(String),
      },
    );
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
        accessToken: 'signed-access-token',
      },
    });
    expect(response.body).not.toHaveProperty('data.user.password');
    expect(response.body).not.toHaveProperty('data.user.passwordHash');
    expect(response.body).not.toHaveProperty('data.refreshToken');

    const cookies = response.headers['set-cookie'];

    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('claypot_refresh=raw-refresh-token')]),
    );
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('HttpOnly')]));
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('Path=/api/v1/auth')]));
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('SameSite=Lax')]));
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
    expect(createAuthSessionMock).not.toHaveBeenCalled();
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
    expect(createAuthSessionMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/auth/login', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('authenticates an account and creates a session', async () => {
    authenticateUserMock.mockResolvedValue({
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
    createAuthSessionMock.mockResolvedValue({
      accessToken: 'signed-access-token',
      refreshToken: 'raw-refresh-token',
      refreshTokenExpiresAt: new Date('2026-08-03T08:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Claypot test browser')
      .send({
        identifier: '  AMINA@EXAMPLE.COM  ',
        password: 'Claypot9',
      })
      .expect(200);

    expect(authenticateUserMock).toHaveBeenCalledWith({
      identifier: 'amina@example.com',
      password: 'Claypot9',
    });
    expect(createAuthSessionMock).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        role: 'user',
      },
      {
        userAgent: 'Claypot test browser',
        ipAddress: expect.any(String),
      },
    );
    expect(response.body).toMatchObject({
      data: {
        user: {
          id: 'user-id',
          username: 'amina_kitchen',
          email: 'amina@example.com',
        },
        accessToken: 'signed-access-token',
      },
    });
    expect(response.body).not.toHaveProperty('data.refreshToken');
    const cookies = response.headers['set-cookie'];

    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('claypot_refresh=raw-refresh-token')]),
    );
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('HttpOnly')]));
  });

  it('rejects malformed input before authentication', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'invalid',
        password: '',
      })
      .expect(400);

    expect(authenticateUserMock).not.toHaveBeenCalled();
    expect(createAuthSessionMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns an unauthorized response without creating a session', async () => {
    authenticateUserMock.mockRejectedValue(
      new AppError(401, 'INVALID_CREDENTIALS', 'Email, username, or password is incorrect.'),
    );

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'amina_kitchen',
        password: 'Incorrect9',
      })
      .expect(401);

    expect(createAuthSessionMock).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email, username, or password is incorrect.',
      },
    });
  });
});
