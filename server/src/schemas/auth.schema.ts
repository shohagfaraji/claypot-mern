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

export const verifyEmailInputSchema = z.strictObject({
  token: z
    .string()
    .trim()
    .length(43, 'Verification token is invalid.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Verification token is invalid.'),
});

export const requestEmailChangeInputSchema = z.strictObject({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Current password is required.')
    .max(72, 'Current password cannot exceed 72 characters.')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Current password cannot exceed 72 bytes.',
    }),
});

export const confirmEmailChangeInputSchema = z.strictObject({
  token: z
    .string()
    .trim()
    .length(43, 'Email change token is invalid.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Email change token is invalid.'),
});

export const requestPasswordResetInputSchema = z.strictObject({
  email: emailSchema,
});

export const resetPasswordInputSchema = z.strictObject({
  token: z
    .string()
    .trim()
    .length(43, 'Password reset token is invalid.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Password reset token is invalid.'),
  password: passwordSchema,
});

export const changePasswordInputSchema = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, 'Current password is required.')
      .max(72, 'Current password cannot exceed 72 characters.')
      .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
        message: 'Current password cannot exceed 72 bytes.',
      }),
    newPassword: passwordSchema,
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password.',
  });

export const deleteAccountInputSchema = z.strictObject({
  password: z
    .string()
    .min(1, 'Current password is required.')
    .max(72, 'Current password cannot exceed 72 characters.')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Current password cannot exceed 72 bytes.',
    }),
  confirmation: z
    .string()
    .trim()
    .min(3, 'Enter your username to confirm account deletion.')
    .max(30, 'Username cannot exceed 30 characters.'),
});

export const sessionIdParamsSchema = z.strictObject({
  sessionId: z.string().regex(/^[a-f0-9]{24}$/i, 'Session ID is invalid.'),
});

export const updateProfileInputSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(2, 'Name must contain at least 2 characters.')
      .max(80, 'Name cannot exceed 80 characters.')
      .optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(2_048, 'Avatar URL is too long.')
      .pipe(z.url('Enter a valid avatar URL.'))
      .nullable()
      .optional(),
    avatarPublicId: z
      .string()
      .trim()
      .min(1, 'Avatar public ID cannot be empty.')
      .max(500, 'Avatar public ID is too long.')
      .regex(/^[a-zA-Z0-9/_-]+$/, 'Avatar public ID is invalid.')
      .nullable()
      .optional(),
    bio: z.string().trim().max(300, 'Bio cannot exceed 300 characters.').nullable().optional(),
  })
  .superRefine((input, context) => {
    if (input.avatarPublicId && !input.avatarUrl) {
      context.addIssue({
        code: 'custom',
        path: ['avatarUrl'],
        message: 'An avatar URL is required for a managed avatar.',
      });
    }
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Add at least one profile field to update.',
  });

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeInputSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeInputSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
