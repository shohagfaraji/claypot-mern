import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { createApiProxyGuard } from '../../src/middleware/api-proxy.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { createRateLimiter } from '../../src/middleware/rate-limit.js';

const secret = 'test-proxy-secret-with-at-least-32-characters';
const originalSecret = env.API_PROXY_SECRET;

function guardedApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(createApiProxyGuard(secret));
  app.get(
    '/limited',
    createRateLimiter({ identifier: 'proxy-test', limit: 1 }),
    (request, response) => response.json({ clientIp: request.clientIp }),
  );
  app.use(errorHandler);
  return app;
}

describe('trusted API proxy', () => {
  afterEach(() => {
    env.API_PROXY_SECRET = originalSecret;
  });

  it.each(['', 'incorrect', 'x'.repeat(secret.length)])(
    'rejects a missing or incorrect secret',
    async (provided) => {
      await request(guardedApp())
        .get('/limited')
        .set('X-Claypot-Proxy-Secret', provided)
        .set('X-Claypot-Client-Ip', '203.0.113.10')
        .expect(403);
    },
  );

  it.each(['', 'invalid', '203.0.113.10, 192.0.2.20'])(
    'rejects invalid client addresses',
    async (address) => {
      await request(guardedApp())
        .get('/limited')
        .set('X-Claypot-Proxy-Secret', secret)
        .set('X-Claypot-Client-Ip', address)
        .expect(400);
    },
  );

  it.each(['203.0.113.10', '2001:db8::1'])(
    'accepts a verified client address: %s',
    async (address) => {
      const response = await request(guardedApp())
        .get('/limited')
        .set('X-Claypot-Proxy-Secret', secret)
        .set('X-Claypot-Client-Ip', address)
        .expect(200);
      expect(response.body).toEqual({ clientIp: address });
    },
  );

  it('limits the verified client independently of forwarded headers', async () => {
    const app = guardedApp();
    const client = (address: string, forwarded: string) =>
      request(app)
        .get('/limited')
        .set('X-Claypot-Proxy-Secret', secret)
        .set('X-Claypot-Client-Ip', address)
        .set('X-Forwarded-For', forwarded);
    await client('203.0.113.10', '192.0.2.10').expect(200);
    await client('203.0.113.10', '192.0.2.11').expect(429);
    await client('203.0.113.11', '192.0.2.10').expect(200);
  });

  it('ignores the client address header when the proxy is not configured', async () => {
    env.API_PROXY_SECRET = undefined;
    const app = express();
    app.use(createApiProxyGuard());
    app.get('/', (request, response) =>
      response.json({ verified: request.clientIp !== undefined }),
    );
    const response = await request(app)
      .get('/')
      .set('X-Claypot-Client-Ip', '203.0.113.10')
      .expect(200);
    expect(response.body).toEqual({ verified: false });
  });

  it('keeps health checks public and protects application routes', async () => {
    env.API_PROXY_SECRET = secret;
    const app = createApp();
    await request(app).get('/api/v1/health').expect(200);
    const response = await request(app).get('/api/v1/recipes').expect(403);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
