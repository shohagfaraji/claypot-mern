import type { AccessTokenIdentity } from '../lib/access-token.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenIdentity;
    }
  }
}

export {};
