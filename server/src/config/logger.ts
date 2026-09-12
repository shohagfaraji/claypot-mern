import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-claypot-proxy-secret"]',
      'res.headers["set-cookie"]',
    ],
    censor: '[Redacted]',
  },
});
