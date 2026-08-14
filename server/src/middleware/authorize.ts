import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { AccessTokenIdentity } from '../lib/access-token.js';

type UserRole = AccessTokenIdentity['role'];

export function authorizeRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (request.auth === undefined) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required.'));
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
      return;
    }

    next();
  };
}
