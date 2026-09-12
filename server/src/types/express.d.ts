import type { AccessTokenIdentity } from '../lib/access-token.js';

declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
      auth?: AccessTokenIdentity;
      validatedParams?: unknown;
      validatedQuery?: unknown;
    }
  }
}

export {};
