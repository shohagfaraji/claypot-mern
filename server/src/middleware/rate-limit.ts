import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../config/env.js';

type RateLimitKey = 'account' | 'ip';

interface CreateRateLimiterOptions {
  identifier: string;
  limit: number;
  windowMs?: number;
  key?: RateLimitKey;
  skipSuccessfulRequests?: boolean;
}

const millisecondsPerMinute = 60_000;
const defaultWindowMs = env.RATE_LIMIT_WINDOW_MINUTES * millisecondsPerMinute;
const rateLimitError = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  },
};

function getIpKey(request: Request): string {
  return `ip:${ipKeyGenerator(request.clientIp ?? request.ip ?? request.socket.remoteAddress ?? '0.0.0.0')}`;
}

function getAccountKey(request: Request): string {
  return request.auth === undefined ? getIpKey(request) : `account:${request.auth.userId}`;
}

export function createRateLimiter({
  identifier,
  limit,
  windowMs = defaultWindowMs,
  key = 'ip',
  skipSuccessfulRequests = false,
}: CreateRateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    identifier,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: key === 'account' ? getAccountKey : getIpKey,
    handler: (_request, response, _next, options) => {
      response.setHeader('Cache-Control', 'no-store');
      response.status(options.statusCode).json(rateLimitError);
    },
  });
}

export const loginRateLimit = createRateLimiter({
  identifier: 'login',
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
});

export const registrationRateLimit = createRateLimiter({
  identifier: 'registration',
  limit: env.REGISTRATION_RATE_LIMIT_MAX,
});

export const passwordRecoveryRateLimit = createRateLimiter({
  identifier: 'password-recovery',
  limit: env.PASSWORD_RECOVERY_RATE_LIMIT_MAX,
});

export const emailActionRateLimit = createRateLimiter({
  identifier: 'email-action',
  limit: env.EMAIL_ACTION_RATE_LIMIT_MAX,
  key: 'account',
});

export const refreshRateLimit = createRateLimiter({
  identifier: 'token-refresh',
  limit: env.REFRESH_RATE_LIMIT_MAX,
});

export const mediaRateLimit = createRateLimiter({
  identifier: 'media',
  limit: env.MEDIA_RATE_LIMIT_MAX,
  key: 'account',
});

export const contentReportRateLimit = createRateLimiter({
  identifier: 'content-report',
  limit: env.CONTENT_REPORT_RATE_LIMIT_MAX,
  key: 'account',
});

export const followActionRateLimit = createRateLimiter({
  identifier: 'follow-action',
  limit: env.FOLLOW_ACTION_RATE_LIMIT_MAX,
  key: 'account',
});
