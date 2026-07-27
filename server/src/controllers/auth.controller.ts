import type { RequestHandler } from 'express';
import { getRefreshTokenCookieOptions, refreshTokenCookieName } from '../lib/refresh-token.js';
import type { RegisterInput } from '../schemas/auth.schema.js';
import { registerUser } from '../services/auth.service.js';
import { createAuthSession } from '../services/session.service.js';

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);
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
  response.status(201).json({
    data: {
      user,
      accessToken: session.accessToken,
    },
  });
};
