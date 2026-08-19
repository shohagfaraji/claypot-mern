import { Resend } from 'resend';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export interface EmailVerificationMessage {
  recipientName: string;
  recipientEmail: string;
  token: string;
}

export interface PasswordResetMessage {
  recipientName: string;
  recipientEmail: string;
  token: string;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

export async function sendEmailVerificationMessage(
  message: EmailVerificationMessage,
): Promise<void> {
  if (env.RESEND_API_KEY === undefined || env.EMAIL_FROM === undefined) {
    throw new AppError(
      503,
      'EMAIL_DELIVERY_UNAVAILABLE',
      'Email delivery is not configured right now.',
    );
  }

  const verificationUrl = new URL('/verify-email', env.CLIENT_ORIGIN);
  verificationUrl.searchParams.set('token', message.token);
  const safeName = escapeHtml(message.recipientName);
  const safeUrl = escapeHtml(verificationUrl.toString());
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: message.recipientEmail,
    subject: 'Verify your Claypot email address',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524"><p style="font-size:14px;color:#c2410c;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Claypot</p><h1 style="font-size:28px;line-height:1.2;margin:20px 0 12px">Verify your email address</h1><p style="font-size:16px;line-height:1.7">Hello ${safeName}, confirm this email address to complete your Claypot profile.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Verify email address</a></p><p style="font-size:14px;line-height:1.6;color:#78716c">This link expires in ${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours. If you did not create a Claypot account, you can ignore this message.</p></div>`,
    text: `Hello ${message.recipientName},\n\nVerify your Claypot email address by opening this link:\n${verificationUrl.toString()}\n\nThis link expires in ${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours. If you did not create a Claypot account, you can ignore this message.`,
  });

  if (error !== null) {
    throw new AppError(
      503,
      'EMAIL_DELIVERY_FAILED',
      'The verification email could not be sent right now.',
      { cause: error },
    );
  }
}

export async function sendPasswordResetMessage(message: PasswordResetMessage): Promise<void> {
  if (env.RESEND_API_KEY === undefined || env.EMAIL_FROM === undefined) {
    throw new AppError(
      503,
      'EMAIL_DELIVERY_UNAVAILABLE',
      'Email delivery is not configured right now.',
    );
  }

  const resetUrl = new URL('/reset-password', env.CLIENT_ORIGIN);
  resetUrl.searchParams.set('token', message.token);
  const safeName = escapeHtml(message.recipientName);
  const safeUrl = escapeHtml(resetUrl.toString());
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: message.recipientEmail,
    subject: 'Reset your Claypot password',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524"><p style="font-size:14px;color:#c2410c;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Claypot</p><h1 style="font-size:28px;line-height:1.2;margin:20px 0 12px">Reset your password</h1><p style="font-size:16px;line-height:1.7">Hello ${safeName}, use this private link to choose a new password for your Claypot account.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Reset password</a></p><p style="font-size:14px;line-height:1.6;color:#78716c">This link expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes and can only be used once. If you did not request it, you can ignore this message.</p></div>`,
    text: `Hello ${message.recipientName},\n\nReset your Claypot password by opening this link:\n${resetUrl.toString()}\n\nThis link expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes and can only be used once. If you did not request it, you can ignore this message.`,
  });

  if (error !== null) {
    throw new AppError(
      503,
      'EMAIL_DELIVERY_FAILED',
      'The password reset email could not be sent right now.',
    );
  }
}
