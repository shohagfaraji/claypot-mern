import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { getRefreshTokenCookieOptions, refreshTokenCookieName } from '../lib/refresh-token.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { authenticateUser, type PublicUser, registerUser } from '../services/auth.service.js';
import { createAuthSession, rotateAuthSession } from '../services/session.service.js';

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

  response.status(201).json({
    data: {
      user,
      accessToken,
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
