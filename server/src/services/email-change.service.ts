import { startSession, Types } from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { createEmailChangeToken, hashEmailChangeToken } from '../lib/email-change-token.js';
import { verifyPassword } from '../lib/password.js';
import { hashRefreshToken } from '../lib/refresh-token.js';
import { EmailChangeTokenModel } from '../models/email-change-token.model.js';
import { EmailVerificationTokenModel } from '../models/email-verification-token.model.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { UserModel } from '../models/user.model.js';
import { sendEmailChangeMessage } from './email.service.js';

const millisecondsPerHour = 60 * 60 * 1_000;
const millisecondsPerSecond = 1_000;

export interface PendingEmailChange {
  email: string;
  expiresAt: Date;
  canResendAt: Date;
}

export interface ConfirmedEmailChange {
  status: 'changed';
  currentSessionPreserved: boolean;
  previousEmail: string;
  recipientName: string;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function cooldownError(): AppError {
  return new AppError(
    429,
    'EMAIL_CHANGE_COOLDOWN',
    'Please wait before requesting another email change message.',
  );
}

function unavailableError(): AppError {
  return new AppError(409, 'EMAIL_UNAVAILABLE', 'That email address is not available.');
}

async function issueEmailChange(userId: string, name: string, pendingEmail: string): Promise<void> {
  const now = new Date();
  const token = createEmailChangeToken();
  const tokenHash = hashEmailChangeToken(token);
  const expiresAt = new Date(
    now.getTime() + env.EMAIL_CHANGE_TOKEN_TTL_HOURS * millisecondsPerHour,
  );
  const cooldownStartedBefore = new Date(
    now.getTime() - env.EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS * millisecondsPerSecond,
  );
  const userObjectId = new Types.ObjectId(userId);

  await EmailChangeTokenModel.deleteMany({
    user: { $ne: userObjectId },
    pendingEmail,
    expiresAt: { $lte: now },
  });

  try {
    await EmailChangeTokenModel.findOneAndUpdate(
      {
        user: userObjectId,
        $or: [{ updatedAt: { $lte: cooldownStartedBefore } }, { updatedAt: { $exists: false } }],
      },
      {
        $set: { pendingEmail, tokenHash, expiresAt, consumedAt: null, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const recentRequest = await EmailChangeTokenModel.exists({
      user: userObjectId,
      updatedAt: { $gt: cooldownStartedBefore },
    });
    if (recentRequest !== null) throw cooldownError();
    throw unavailableError();
  }

  try {
    await sendEmailChangeMessage({ recipientName: name, recipientEmail: pendingEmail, token });
  } catch (error) {
    await EmailChangeTokenModel.deleteOne({ user: userObjectId, tokenHash });
    throw error;
  }
}

export async function requestEmailChange(
  userId: string,
  pendingEmail: string,
  password: string,
): Promise<PendingEmailChange> {
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (user === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
  }
  if (pendingEmail === user.email) {
    throw new AppError(400, 'EMAIL_UNCHANGED', 'Enter a different email address.');
  }

  const existingUser = await UserModel.exists({ email: pendingEmail, _id: { $ne: user._id } });
  const activeReservation = await EmailChangeTokenModel.exists({
    user: { $ne: user._id },
    pendingEmail,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (existingUser !== null || activeReservation !== null) throw unavailableError();

  await issueEmailChange(userId, user.name, pendingEmail);
  const pending = await getPendingEmailChange(userId);
  if (pending === null) throw new Error('Email change request did not complete.');
  return pending;
}

export async function getPendingEmailChange(userId: string): Promise<PendingEmailChange | null> {
  const pending = await EmailChangeTokenModel.findOne({
    user: userId,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('pendingEmail expiresAt updatedAt');

  if (pending === null) return null;
  return {
    email: pending.pendingEmail,
    expiresAt: pending.expiresAt,
    canResendAt: new Date(
      pending.updatedAt.getTime() +
        env.EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS * millisecondsPerSecond,
    ),
  };
}

export async function resendEmailChange(userId: string): Promise<PendingEmailChange> {
  const user = await UserModel.findById(userId).select('name');
  if (user === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const pending = await getPendingEmailChange(userId);
  if (pending === null) {
    throw new AppError(404, 'EMAIL_CHANGE_NOT_FOUND', 'No pending email change was found.');
  }

  await issueEmailChange(userId, user.name, pending.email);
  const updatedPending = await getPendingEmailChange(userId);
  if (updatedPending === null) throw new Error('Email change resend did not complete.');
  return updatedPending;
}

export async function cancelEmailChange(userId: string): Promise<void> {
  await EmailChangeTokenModel.deleteOne({ user: userId, consumedAt: null });
}

export async function confirmEmailChange(
  token: string,
  currentRefreshToken?: string,
): Promise<ConfirmedEmailChange> {
  const now = new Date();
  const tokenHash = hashEmailChangeToken(token);
  const currentRefreshTokenHash = currentRefreshToken
    ? hashRefreshToken(currentRefreshToken)
    : null;
  const session = await startSession();
  let result: ConfirmedEmailChange | null = null;

  try {
    await session.withTransaction(async () => {
      const pending = await EmailChangeTokenModel.findOneAndUpdate(
        { tokenHash, consumedAt: null, expiresAt: { $gt: now } },
        { $set: { consumedAt: now } },
        { session, returnDocument: 'after' },
      );
      if (pending === null) {
        throw new AppError(
          400,
          'INVALID_EMAIL_CHANGE_TOKEN',
          'This email change link is invalid or has expired.',
        );
      }

      const user = await UserModel.findById(pending.user, null, { session });
      if (user === null) {
        throw new AppError(
          400,
          'INVALID_EMAIL_CHANGE_TOKEN',
          'This email change link is invalid or has expired.',
        );
      }

      const conflictingUser = await UserModel.findOne(
        { email: pending.pendingEmail, _id: { $ne: user._id } },
        null,
        { session },
      );
      if (conflictingUser !== null) throw unavailableError();

      let currentSessionId: Types.ObjectId | null = null;
      if (currentRefreshTokenHash !== null) {
        const currentSession = await RefreshSessionModel.findOne(
          {
            user: user._id,
            tokenHash: currentRefreshTokenHash,
            revokedAt: null,
            expiresAt: { $gt: now },
          },
          null,
          { session },
        );
        currentSessionId = currentSession?._id ?? null;
      }

      const previousEmail = user.email;
      user.email = pending.pendingEmail;
      user.isEmailVerified = true;
      await user.save({ session });
      await EmailVerificationTokenModel.deleteOne({ user: user._id }, { session });
      await RefreshSessionModel.updateMany(
        {
          user: user._id,
          revokedAt: null,
          ...(currentSessionId === null ? {} : { _id: { $ne: currentSessionId } }),
        },
        { $set: { revokedAt: now } },
        { session },
      );

      result = {
        status: 'changed',
        currentSessionPreserved: currentSessionId !== null,
        previousEmail,
        recipientName: user.name,
      };
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw unavailableError();
    throw error;
  } finally {
    await session.endSession();
  }

  if (result === null) throw new Error('Email change confirmation did not complete.');
  return result;
}
