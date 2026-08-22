import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('environment configuration', () => {
  it('provides local development defaults', () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 5000,
      TRUST_PROXY_HOPS: 0,
      CLIENT_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'info',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/claypot',
      MONGODB_SERVER_SELECTION_TIMEOUT_MS: 5000,
      MONGODB_MAX_POOL_SIZE: 10,
      ACCESS_TOKEN_SECRET: 'development-only-access-token-secret',
      ACCESS_TOKEN_TTL_MINUTES: 15,
      REFRESH_TOKEN_TTL_DAYS: 7,
      RATE_LIMIT_WINDOW_MINUTES: 15,
      LOGIN_RATE_LIMIT_MAX: 10,
      REGISTRATION_RATE_LIMIT_MAX: 5,
      PASSWORD_RECOVERY_RATE_LIMIT_MAX: 5,
      EMAIL_ACTION_RATE_LIMIT_MAX: 10,
      REFRESH_RATE_LIMIT_MAX: 30,
      MEDIA_RATE_LIMIT_MAX: 30,
      EMAIL_VERIFICATION_TOKEN_TTL_HOURS: 24,
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: 60,
      EMAIL_CHANGE_TOKEN_TTL_HOURS: 24,
      EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS: 60,
      PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
      PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: 60,
    });
  });

  it('coerces a valid port number', () => {
    expect(loadEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('coerces valid proxy and rate-limit settings', () => {
    expect(
      loadEnv({
        TRUST_PROXY_HOPS: '1',
        RATE_LIMIT_WINDOW_MINUTES: '30',
        LOGIN_RATE_LIMIT_MAX: '20',
      }),
    ).toMatchObject({
      TRUST_PROXY_HOPS: 1,
      RATE_LIMIT_WINDOW_MINUTES: 30,
      LOGIN_RATE_LIMIT_MAX: 20,
    });
  });

  it('rejects invalid configuration', () => {
    expect(() => loadEnv({ PORT: '0' })).toThrow('Invalid environment variables');
    expect(() => loadEnv({ CLIENT_ORIGIN: 'not-a-url' })).toThrow('Invalid environment variables');
    expect(() => loadEnv({ MONGODB_URI: 'https://example.com/claypot' })).toThrow(
      'Invalid environment variables',
    );
    expect(() => loadEnv({ ACCESS_TOKEN_SECRET: 'too-short' })).toThrow(
      'Invalid environment variables',
    );
    expect(() => loadEnv({ REFRESH_TOKEN_TTL_DAYS: '31' })).toThrow(
      'Invalid environment variables',
    );
    expect(() => loadEnv({ TRUST_PROXY_HOPS: '-1' })).toThrow('Invalid environment variables');
    expect(() => loadEnv({ LOGIN_RATE_LIMIT_MAX: '0' })).toThrow('Invalid environment variables');
  });

  it('requires a unique access token secret in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(
      'A unique access token secret is required in production',
    );
  });

  it('requires all Cloudinary credentials when media storage is configured', () => {
    expect(() => loadEnv({ CLOUDINARY_CLOUD_NAME: 'claypot' })).toThrow(
      'Cloudinary cloud name, API key, and API secret must be configured together',
    );

    expect(
      loadEnv({
        CLOUDINARY_CLOUD_NAME: 'claypot',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'api-secret',
      }),
    ).toMatchObject({
      CLOUDINARY_CLOUD_NAME: 'claypot',
      CLOUDINARY_API_KEY: 'api-key',
      CLOUDINARY_API_SECRET: 'api-secret',
    });
  });

  it('requires the Resend key and sender to be configured together', () => {
    expect(() => loadEnv({ RESEND_API_KEY: 're_test_key' })).toThrow(
      'Resend API key and email sender must be configured together',
    );

    expect(
      loadEnv({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM: 'Claypot <onboarding@resend.dev>',
      }),
    ).toMatchObject({
      RESEND_API_KEY: 're_test_key',
      EMAIL_FROM: 'Claypot <onboarding@resend.dev>',
    });
  });
});
