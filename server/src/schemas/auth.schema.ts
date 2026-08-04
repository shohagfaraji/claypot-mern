import { z } from 'zod';

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must contain at least 3 characters.')
  .max(30, 'Username cannot exceed 30 characters.')
  .regex(
    /^[a-z0-9][a-z0-9_]*[a-z0-9]$/,
    'Username can contain lowercase letters, numbers, and underscores.',
  );

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email address is too long.')
  .pipe(z.email('Enter a valid email address.'));

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 bytes.',
  });

export const registerInputSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters.')
    .max(80, 'Name cannot exceed 80 characters.'),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginIdentifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email address or username.')
  .max(254, 'Email address or username is too long.')
  .refine(
    (identifier) =>
      z.email().safeParse(identifier).success || usernameSchema.safeParse(identifier).success,
    'Enter a valid email address or username.',
  );

export const loginInputSchema = z.strictObject({
  identifier: loginIdentifierSchema,
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(72, 'Password cannot exceed 72 characters.')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Password cannot exceed 72 bytes.',
    }),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
