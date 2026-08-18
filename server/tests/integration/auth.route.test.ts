import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

const {
  authenticateUserMock,
  createAuthSessionMock,
  requestEmailVerificationMock,
  registerUserMock,
  revokeAuthSessionMock,
  rotateAuthSessionMock,
  sendEmailVerificationMock,
  verifyAccessTokenMock,
  verifyEmailMock,
} = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  createAuthSessionMock: vi.fn(),
  requestEmailVerificationMock: vi.fn(),
  registerUserMock: vi.fn(),
  revokeAuthSessionMock: vi.fn(),
  rotateAuthSessionMock: vi.fn(),
  sendEmailVerificationMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
  verifyEmailMock: vi.fn(),
}));

vi.mock('../../src/lib/access-token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../../src/services/auth.service.js', () => ({
  authenticateUser: authenticateUserMock,
  registerUser: registerUserMock,
}));

vi.mock('../../src/services/email-verification.service.js', () => ({
  requestEmailVerification: requestEmailVerificationMock,
  sendEmailVerification: sendEmailVerificationMock,
  verifyEmail: verifyEmailMock,
}));

vi.mock('../../src/services/session.service.js', () => ({
  createAuthSession: createAuthSessionMock,
  revokeAuthSession: revokeAuthSessionMock,
  rotateAuthSession: rotateAuthSessionMock,
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
    sendEmailVerificationMock.mockResolvedValue('sent');

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
        verificationEmailSent: true,
      },
    });
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-id', email: 'amina@example.com' }),
    );
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
    expect(sendEmailVerificationMock).not.toHaveBeenCalled();
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
    expect(sendEmailVerificationMock).not.toHaveBeenCalled();
  });

  it('keeps the account session when verification email delivery fails', async () => {
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
    sendEmailVerificationMock.mockRejectedValue(new Error('Provider unavailable'));

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registrationBody)
      .expect(201);

    expect(response.body.data.verificationEmailSent).toBe(false);
    expect(response.body.data.accessToken).toBe('signed-access-token');
  });
});

describe('POST /api/v1/auth/email-verification/verify', () => {
  const app = createApp();
  const token = 'a'.repeat(43);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('verifies a valid email token without requiring a session', async () => {
    verifyEmailMock.mockResolvedValue('verified');

    const response = await request(app)
      .post('/api/v1/auth/email-verification/verify')
      .send({ token })
      .expect(200);

    expect(verifyEmailMock).toHaveBeenCalledWith(token);
    expect(response.body).toEqual({ data: { status: 'verified' } });
  });

  it('rejects malformed tokens before calling the service', async () => {
    const response = await request(app)
      .post('/api/v1/auth/email-verification/verify')
      .send({ token: 'invalid' })
      .expect(400);

    expect(verifyEmailMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/email-verification/resend', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requests a new verification email for the authenticated account', async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: 'user-id', role: 'user' });
    requestEmailVerificationMock.mockResolvedValue('sent');

    const response = await request(app)
      .post('/api/v1/auth/email-verification/resend')
      .set('Authorization', 'Bearer signed-access-token')
      .expect(202);

    expect(requestEmailVerificationMock).toHaveBeenCalledWith('user-id');
    expect(response.body).toEqual({ data: { status: 'sent' } });
  });

  it('does not reveal account information without authentication', async () => {
    const response = await request(app).post('/api/v1/auth/email-verification/resend').expect(401);

    expect(requestEmailVerificationMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
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

describe('POST /api/v1/auth/refresh', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rotates the refresh token and returns a new access token', async () => {
    rotateAuthSessionMock.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresAt: new Date('2026-08-12T08:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'claypot_refresh=current-refresh-token')
      .set('User-Agent', 'Claypot test browser')
      .expect(200);

    expect(rotateAuthSessionMock).toHaveBeenCalledWith('current-refresh-token', {
      userAgent: 'Claypot test browser',
      ipAddress: expect.any(String),
    });
    expect(response.body).toEqual({
      data: {
        accessToken: 'new-access-token',
      },
    });
    expect(response.body).not.toHaveProperty('data.refreshToken');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('claypot_refresh=new-refresh-token')]),
    );
  });

  it('rejects requests without a refresh cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').expect(401);

    expect(rotateAuthSessionMock).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('INVALID_SESSION');
  });

  it('rejects an invalid refresh session', async () => {
    rotateAuthSessionMock.mockRejectedValue(
      new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.'),
    );

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'claypot_refresh=invalid-refresh-token')
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_SESSION',
        message: 'Refresh session is invalid or expired.',
      },
    });
  });
});

describe('POST /api/v1/auth/logout', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    revokeAuthSessionMock.mockResolvedValue(undefined);
  });

  it('revokes the current session and clears the refresh cookie', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'claypot_refresh=current-refresh-token')
      .expect(204);

    expect(revokeAuthSessionMock).toHaveBeenCalledWith('current-refresh-token');
    expect(response.text).toBe('');

    const cookies = response.headers['set-cookie'];

    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('claypot_refresh=')]));
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('Expires=Thu, 01 Jan 1970')]),
    );
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('Path=/api/v1/auth')]));
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('HttpOnly')]));
  });

  it('remains successful when no refresh cookie is present', async () => {
    const response = await request(app).post('/api/v1/auth/logout').expect(204);

    expect(revokeAuthSessionMock).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('claypot_refresh=')]),
    );
  });
});
