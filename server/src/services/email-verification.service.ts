import { startSession, Types } from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
} from '../lib/email-verification-token.js';
import { EmailVerificationTokenModel } from '../models/email-verification-token.model.js';
import { UserModel } from '../models/user.model.js';
import { sendEmailVerificationMessage } from './email.service.js';

const millisecondsPerHour = 60 * 60 * 1_000;
const millisecondsPerSecond = 1_000;

export type EmailVerificationRequestStatus = 'sent' | 'already_verified';
export type EmailVerificationStatus = 'verified' | 'already_verified';

export interface VerifiableUser {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function cooldownError(): AppError {
  return new AppError(
    429,
    'VERIFICATION_EMAIL_COOLDOWN',
    'Please wait before requesting another verification email.',
  );
}

export async function sendEmailVerification(
  user: VerifiableUser,
): Promise<EmailVerificationRequestStatus> {
  if (user.isEmailVerified) {
    return 'already_verified';
  }

  const now = new Date();
  const token = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = new Date(
    now.getTime() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * millisecondsPerHour,
  );
  const cooldownStartedBefore = new Date(
    now.getTime() - env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * millisecondsPerSecond,
  );
  const userId = new Types.ObjectId(user.id);

  try {
    await EmailVerificationTokenModel.findOneAndUpdate(
      {
        user: userId,
        $or: [{ updatedAt: { $lte: cooldownStartedBefore } }, { updatedAt: { $exists: false } }],
      },
      {
        $set: {
          tokenHash,
          expiresAt,
          consumedAt: null,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw cooldownError();
    }

    throw error;
  }

  try {
    await sendEmailVerificationMessage({
      recipientName: user.name,
      recipientEmail: user.email,
      token,
    });
  } catch (error) {
    await EmailVerificationTokenModel.deleteOne({ user: userId, tokenHash });
    throw error;
  }

  return 'sent';
}

export async function requestEmailVerification(
  userId: string,
): Promise<EmailVerificationRequestStatus> {
  const user = await UserModel.findById(userId).select('name email isEmailVerified');

  if (user === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  return sendEmailVerification(user);
}

export async function verifyEmail(token: string): Promise<EmailVerificationStatus> {
  const now = new Date();
  const tokenHash = hashEmailVerificationToken(token);
  const session = await startSession();
  let status: EmailVerificationStatus | null = null;

  try {
    await session.withTransaction(async () => {
      const verificationToken = await EmailVerificationTokenModel.findOne(
        {
          tokenHash,
          expiresAt: { $gt: now },
        },
        null,
        { session },
      );

      if (verificationToken === null) {
        throw new AppError(
          400,
          'INVALID_VERIFICATION_TOKEN',
          'This verification link is invalid or has expired.',
        );
      }

      if (verificationToken.consumedAt !== null) {
        status = 'already_verified';
        return;
      }

      const user = await UserModel.findById(verificationToken.user, null, { session });

      if (user === null) {
        throw new AppError(
          400,
          'INVALID_VERIFICATION_TOKEN',
          'This verification link is invalid or has expired.',
        );
      }

      if (user.isEmailVerified) {
        verificationToken.consumedAt = now;
        await verificationToken.save({ session });
        status = 'already_verified';
        return;
      }

      user.isEmailVerified = true;
      verificationToken.consumedAt = now;
      await user.save({ session });
      await verificationToken.save({ session });
      status = 'verified';
    });
  } finally {
    await session.endSession();
  }

  if (status === null) {
    throw new Error('Email verification did not complete.');
  }

  return status;
}
