import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('environment configuration', () => {
  it('provides local development defaults', () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 5000,
      CLIENT_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'info',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/claypot',
      MONGODB_SERVER_SELECTION_TIMEOUT_MS: 5000,
      MONGODB_MAX_POOL_SIZE: 10,
    });
  });

  it('coerces a valid port number', () => {
    expect(loadEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects invalid configuration', () => {
    expect(() => loadEnv({ PORT: '0' })).toThrow('Invalid environment variables');
    expect(() => loadEnv({ CLIENT_ORIGIN: 'not-a-url' })).toThrow('Invalid environment variables');
    expect(() => loadEnv({ MONGODB_URI: 'https://example.com/claypot' })).toThrow(
      'Invalid environment variables',
    );
  });
});
