import { startSession, Types } from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { hashPassword } from '../lib/password.js';
import { createPasswordResetToken, hashPasswordResetToken } from '../lib/password-reset-token.js';
import { PasswordResetTokenModel } from '../models/password-reset-token.model.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { UserModel } from '../models/user.model.js';
import { sendPasswordResetMessage } from './email.service.js';

const millisecondsPerMinute = 60 * 1_000;
const millisecondsPerSecond = 1_000;

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email }).select('name email');
  if (user === null) return;

  const now = new Date();
  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(
    now.getTime() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * millisecondsPerMinute,
  );
  const cooldownStartedBefore = new Date(
    now.getTime() - env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * millisecondsPerSecond,
  );

  try {
    await PasswordResetTokenModel.findOneAndUpdate(
      {
        user: user._id,
        $or: [{ updatedAt: { $lte: cooldownStartedBefore } }, { updatedAt: { $exists: false } }],
      },
      {
        $set: { tokenHash, expiresAt, consumedAt: null, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) return;
    throw error;
  }

  try {
    await sendPasswordResetMessage({
      recipientName: user.name,
      recipientEmail: user.email,
      token,
    });
  } catch {
    await PasswordResetTokenModel.deleteOne({ user: user._id, tokenHash });
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const now = new Date();
  const tokenHash = hashPasswordResetToken(token);
  const passwordHash = await hashPassword(password);
  const session = await startSession();
  let completed = false;

  try {
    await session.withTransaction(async () => {
      const resetToken = await PasswordResetTokenModel.findOneAndUpdate(
        { tokenHash, consumedAt: null, expiresAt: { $gt: now } },
        { $set: { consumedAt: now } },
        { session, returnDocument: 'after' },
      ).select('+tokenHash');

      if (resetToken === null) {
        throw new AppError(
          400,
          'INVALID_PASSWORD_RESET_TOKEN',
          'This password reset link is invalid or has expired.',
        );
      }

      const user = await UserModel.findById(resetToken.user, null, { session }).select(
        '+passwordHash',
      );
      if (user === null) {
        throw new AppError(
          400,
          'INVALID_PASSWORD_RESET_TOKEN',
          'This password reset link is invalid or has expired.',
        );
      }

      user.passwordHash = passwordHash;
      await user.save({ session });
      await RefreshSessionModel.updateMany(
        { user: new Types.ObjectId(user.id), revokedAt: null },
        { $set: { revokedAt: now } },
        { session },
      );
      completed = true;
    });
  } finally {
    await session.endSession();
  }

  if (!completed) throw new Error('Password reset did not complete.');
}
