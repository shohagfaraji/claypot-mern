import 'dotenv/config';
import { z } from 'zod';

const developmentAccessTokenSecret = 'development-only-access-token-secret';
const rateLimitMaximumSchema = z.coerce.number().int().positive().max(10_000);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(5000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    CLIENT_ORIGIN: z
      .url()
      .refine(
        (value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return (
            ['http:', 'https:'].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            url.pathname === '/' &&
            !url.search &&
            !url.hash
          );
        },
        {
          message:
            'Must be an HTTP or HTTPS origin without a path, credentials, query, or fragment',
        },
      )
      .transform((value) => new URL(value).origin)
      .default('http://localhost:5173'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MONGODB_URI: z
      .string()
      .refine((value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'), {
        message: 'Must be a valid MongoDB connection string',
      })
      .default('mongodb://127.0.0.1:27017/claypot'),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .max(60_000)
      .default(5000),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().max(100).default(10),
    ACCESS_TOKEN_SECRET: z.string().min(32).default(developmentAccessTokenSecret),
    API_PROXY_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional(),
    ),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(30).default(7),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().max(1_440).default(15),
    LOGIN_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(10),
    REGISTRATION_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(5),
    PASSWORD_RECOVERY_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(5),
    EMAIL_ACTION_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(10),
    REFRESH_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(30),
    MEDIA_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(30),
    CONTENT_REPORT_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(10),
    FOLLOW_ACTION_RATE_LIMIT_MAX: rateLimitMaximumSchema.default(60),
    RESEND_API_KEY: z.string().trim().min(10).optional(),
    EMAIL_FROM: z.string().trim().min(3).max(320).optional(),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().max(168).default(24),
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .max(3_600)
      .default(60),
    EMAIL_CHANGE_TOKEN_TTL_HOURS: z.coerce.number().int().positive().max(168).default(24),
    EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().max(3_600).default(60),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(1440).default(30),
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .max(3_600)
      .default(60),
    CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      (environment.ACCESS_TOKEN_SECRET === developmentAccessTokenSecret ||
        /^(replace-|your-)/i.test(environment.ACCESS_TOKEN_SECRET))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ACCESS_TOKEN_SECRET'],
        message: 'A unique access token secret is required in production',
      });
    }

    if (environment.NODE_ENV === 'production') {
      if (!environment.CLIENT_ORIGIN.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGIN'],
          message: 'An HTTPS website origin is required in production',
        });
      }
      if (environment.MONGODB_URI === 'mongodb://127.0.0.1:27017/claypot') {
        context.addIssue({
          code: 'custom',
          path: ['MONGODB_URI'],
          message: 'An explicit database connection is required in production',
        });
      }
      if (environment.API_PROXY_SECRET === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['API_PROXY_SECRET'],
          message: 'A proxy secret is required in production',
        });
      }
    }
    if (environment.API_PROXY_SECRET === environment.ACCESS_TOKEN_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['API_PROXY_SECRET'],
        message: 'Use different secrets for API proxy access and login tokens',
      });
    }

    const cloudinaryValues = [
      environment.CLOUDINARY_CLOUD_NAME,
      environment.CLOUDINARY_API_KEY,
      environment.CLOUDINARY_API_SECRET,
    ];
    const configuredValues = cloudinaryValues.filter((value) => value !== undefined);

    if (configuredValues.length > 0 && configuredValues.length < cloudinaryValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['CLOUDINARY_CLOUD_NAME'],
        message: 'Cloudinary cloud name, API key, and API secret must be configured together',
      });
    }

    const emailValues = [environment.RESEND_API_KEY, environment.EMAIL_FROM];
    const configuredEmailValues = emailValues.filter((value) => value !== undefined);

    if (configuredEmailValues.length > 0 && configuredEmailValues.length < emailValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Resend API key and email sender must be configured together',
      });
    }
  });

export type Environment = z.infer<typeof envSchema>;

export function loadEnv(environment: NodeJS.ProcessEnv = process.env): Environment {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment variables: ${details}`);
  }

  return result.data;
}

export const env = loadEnv();
