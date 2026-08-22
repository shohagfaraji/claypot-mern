import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/middleware/rate-limit.js';

describe('request rate limiting', () => {
  it('limits each client IP independently and returns standard retry details', async () => {
    const app = express();
    const limiter = createRateLimiter({
      identifier: 'test-ip-policy',
      limit: 2,
      windowMs: 60_000,
    });
    app.set('trust proxy', 1);
    app.get('/limited', limiter, (_request, response) => response.status(200).json({ data: 'ok' }));

    const client = () => request(app).get('/limited').set('X-Forwarded-For', '203.0.113.10');

    await client().expect(200);
    await client().expect(200);
    const blockedResponse = await client().expect(429);
    const otherClientResponse = await request(app)
      .get('/limited')
      .set('X-Forwarded-For', '203.0.113.11')
      .expect(200);

    expect(blockedResponse.body).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
    expect(blockedResponse.headers['retry-after']).toEqual(expect.any(String));
    expect(blockedResponse.headers['cache-control']).toBe('no-store');
    expect(blockedResponse.headers['ratelimit']).toEqual(expect.any(String));
    expect(blockedResponse.headers['ratelimit-policy']).toContain('test-ip-policy');
    expect(blockedResponse.headers['x-ratelimit-limit']).toBeUndefined();
    expect(otherClientResponse.headers['ratelimit-policy']).toContain('test-ip-policy');
  });

  it('isolates authenticated account quotas behind a shared client IP', async () => {
    const app = express();
    const limiter = createRateLimiter({
      identifier: 'test-account-policy',
      limit: 1,
      windowMs: 60_000,
      key: 'account',
    });
    app.use((request, _response, next) => {
      const userId = request.get('x-test-user');
      if (userId !== undefined) request.auth = { userId, role: 'user' };
      next();
    });
    app.get('/limited', limiter, (_request, response) => response.status(200).send());

    await request(app).get('/limited').set('X-Test-User', 'user-a').expect(200);
    await request(app).get('/limited').set('X-Test-User', 'user-b').expect(200);
    await request(app).get('/limited').set('X-Test-User', 'user-a').expect(429);
  });

  it('does not charge successful requests against a failed-attempt budget', async () => {
    const app = express();
    const limiter = createRateLimiter({
      identifier: 'test-failed-attempt-policy',
      limit: 1,
      windowMs: 60_000,
      skipSuccessfulRequests: true,
    });
    app.post('/login', limiter, (incomingRequest, response) => {
      response.status(incomingRequest.get('x-test-result') === 'success' ? 200 : 401).send();
    });

    await request(app).post('/login').set('X-Test-Result', 'success').expect(200);
    await request(app).post('/login').set('X-Test-Result', 'success').expect(200);
    await request(app).post('/login').expect(401);
    await request(app).post('/login').expect(429);
  });
});
