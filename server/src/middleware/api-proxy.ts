import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export function createApiProxyGuard(secret = env.API_PROXY_SECRET): RequestHandler {
  return (request, _response, next) => {
    if (secret === undefined) {
      next();
      return;
    }
    const provided = Buffer.from(request.get('x-claypot-proxy-secret') ?? '');
    const expected = Buffer.from(secret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      next(new AppError(403, 'FORBIDDEN', 'Use the website to access this API.'));
      return;
    }
    const clientIp = request.get('x-claypot-client-ip');
    if (!clientIp || isIP(clientIp) === 0) {
      next(new AppError(400, 'INVALID_CLIENT_IP', 'A valid client address is required.'));
      return;
    }
    request.clientIp = clientIp;
    next();
  };
}
