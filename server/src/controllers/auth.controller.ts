import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import {
  getClearRefreshTokenCookieOptions,
  getRefreshTokenCookieOptions,
  refreshTokenCookieName,
} from '../lib/refresh-token.js';
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from '../schemas/auth.schema.js';
import {
  authenticateUser,
  getCurrentUser,
  type PublicUser,
  registerUser,
  updateCurrentUser,
} from '../services/auth.service.js';
import {
  requestEmailVerification,
  sendEmailVerification,
  verifyEmail,
} from '../services/email-verification.service.js';
import {
  createAuthSession,
  revokeAuthSession,
  rotateAuthSession,
} from '../services/session.service.js';

async function startSession(request: Request, response: Response, user: PublicUser) {
  const userAgent = request.get('user-agent');
  const ipAddress = request.ip;
  const session = await createAuthSession(
    {
      userId: user.id,
      role: user.role,
    },
    {
      ...(ipAddress === undefined ? {} : { ipAddress }),
      ...(userAgent === undefined ? {} : { userAgent }),
    },
  );

  response.cookie(refreshTokenCookieName, session.refreshToken, getRefreshTokenCookieOptions());

  return session.accessToken;
}

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);
  const accessToken = await startSession(request, response, user);
  let verificationEmailSent = false;

  try {
    verificationEmailSent = (await sendEmailVerification(user)) === 'sent';
  } catch (error) {
    request.log.warn({ err: error }, 'Registration verification email was not sent');
  }

  response.status(201).json({
    data: {
      user,
      accessToken,
      verificationEmailSent,
    },
  });
};

export const login: RequestHandler = async (request, response) => {
  const user = await authenticateUser(request.body as LoginInput);
  const accessToken = await startSession(request, response, user);

  response.status(200).json({
    data: {
      user,
      accessToken,
    },
  });
};

export const refresh: RequestHandler = async (request, response) => {
  const currentRefreshToken = request.cookies[refreshTokenCookieName] as unknown;

  if (typeof currentRefreshToken !== 'string' || currentRefreshToken.length === 0) {
    throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
  }

  const userAgent = request.get('user-agent');
  const ipAddress = request.ip;
  const session = await rotateAuthSession(currentRefreshToken, {
    ...(ipAddress === undefined ? {} : { ipAddress }),
    ...(userAgent === undefined ? {} : { userAgent }),
  });

  response.cookie(refreshTokenCookieName, session.refreshToken, getRefreshTokenCookieOptions());
  response.status(200).json({
    data: {
      accessToken: session.accessToken,
    },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const currentRefreshToken = request.cookies[refreshTokenCookieName] as unknown;

  if (typeof currentRefreshToken === 'string' && currentRefreshToken.length > 0) {
    await revokeAuthSession(currentRefreshToken);
  }

  response.clearCookie(refreshTokenCookieName, getClearRefreshTokenCookieOptions());
  response.status(204).send();
};

export const me: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const user = await getCurrentUser(request.auth.userId);

  response.status(200).json({
    data: {
      user,
    },
  });
};

export const updateMe: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const user = await updateCurrentUser(request.auth.userId, request.body as UpdateProfileInput);

  response.status(200).json({
    data: {
      user,
    },
  });
};

export const resendVerificationEmail: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const status = await requestEmailVerification(request.auth.userId);

  response.status(status === 'sent' ? 202 : 200).json({
    data: {
      status,
    },
  });
};

export const confirmEmailVerification: RequestHandler = async (request, response) => {
  const { token } = request.body as VerifyEmailInput;
  const status = await verifyEmail(token);

  response.status(200).json({
    data: {
      status,
    },
  });
};
