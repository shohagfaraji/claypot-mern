import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../lib/access-token.js';

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const [scheme, token, ...remainingParts] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || token === undefined || remainingParts.length > 0) {
    return null;
  }

  return token;
}

function unauthorizedError(): AppError {
  return new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
}

export const authenticate: RequestHandler = async (request, _response, next) => {
  const token = getBearerToken(request.get('authorization'));

  if (token === null) {
    next(unauthorizedError());
    return;
  }

  try {
    request.auth = await verifyAccessToken(token);
    next();
  } catch {
    next(unauthorizedError());
  }
};
