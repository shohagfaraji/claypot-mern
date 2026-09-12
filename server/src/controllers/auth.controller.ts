import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import {
  getClearRefreshTokenCookieOptions,
  getRefreshTokenCookieOptions,
  refreshTokenCookieName,
} from '../lib/refresh-token.js';
import type {
  ChangePasswordInput,
  ConfirmEmailChangeInput,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  RequestEmailChangeInput,
  ResetPasswordInput,
  SessionIdParams,
  UpdateProfileInput,
  VerifyEmailInput,
} from '../schemas/auth.schema.js';
import { deleteAccount as deleteCurrentAccount } from '../services/account-deletion.service.js';
import { changeAccountPassword } from '../services/account-security.service.js';
import {
  authenticateUser,
  getCurrentUser,
  type PublicUser,
  registerUser,
  updateCurrentUser,
} from '../services/auth.service.js';
import {
  requestEmailVerification,
  sendEmailVerification,
  verifyEmail,
} from '../services/email-verification.service.js';
import { requestPasswordReset, resetPassword } from '../services/password-recovery.service.js';
import {
  cancelEmailChange,
  confirmEmailChange as confirmPendingEmailChange,
  getPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
} from '../services/email-change.service.js';
import { sendEmailChangedNotice } from '../services/email.service.js';
import {
  createAuthSession,
  listUserAuthSessions,
  revokeAuthSession,
  revokeOtherUserAuthSessions,
  revokeUserAuthSession,
  rotateAuthSession,
} from '../services/session.service.js';

function requireRefreshToken(request: Request): string {
  const refreshToken = request.cookies[refreshTokenCookieName] as unknown;

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
  }

  return refreshToken;
}

async function startSession(request: Request, response: Response, user: PublicUser) {
  const userAgent = request.get('user-agent');
  const ipAddress = request.clientIp ?? request.ip;
  const session = await createAuthSession(
    {
      userId: user.id,
      role: user.role,
    },
    {
      ...(ipAddress === undefined ? {} : { ipAddress }),
      ...(userAgent === undefined ? {} : { userAgent }),
    },
  );

  response.cookie(refreshTokenCookieName, session.refreshToken, getRefreshTokenCookieOptions());

  return session.accessToken;
}

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);
  const accessToken = await startSession(request, response, user);
  let verificationEmailSent = false;

  try {
    verificationEmailSent = (await sendEmailVerification(user)) === 'sent';
  } catch (error) {
    request.log.warn({ err: error }, 'Registration verification email was not sent');
  }

  response.status(201).json({
    data: {
      user,
      accessToken,
      verificationEmailSent,
    },
  });
};

export const login: RequestHandler = async (request, response) => {
  const user = await authenticateUser(request.body as LoginInput);
  const accessToken = await startSession(request, response, user);

  response.status(200).json({
    data: {
      user,
      accessToken,
    },
  });
};

export const refresh: RequestHandler = async (request, response) => {
  const currentRefreshToken = requireRefreshToken(request);

  const userAgent = request.get('user-agent');
  const ipAddress = request.clientIp ?? request.ip;
  const session = await rotateAuthSession(currentRefreshToken, {
    ...(ipAddress === undefined ? {} : { ipAddress }),
    ...(userAgent === undefined ? {} : { userAgent }),
  });

  response.cookie(refreshTokenCookieName, session.refreshToken, getRefreshTokenCookieOptions());
  response.status(200).json({
    data: {
      accessToken: session.accessToken,
    },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const currentRefreshToken = request.cookies[refreshTokenCookieName] as unknown;

  if (typeof currentRefreshToken === 'string' && currentRefreshToken.length > 0) {
    await revokeAuthSession(currentRefreshToken);
  }

  response.clearCookie(refreshTokenCookieName, getClearRefreshTokenCookieOptions());
  response.status(204).send();
};

export const me: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const user = await getCurrentUser(request.auth.userId);

  response.status(200).json({
    data: {
      user,
    },
  });
};

export const updateMe: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const user = await updateCurrentUser(request.auth.userId, request.body as UpdateProfileInput);

  response.status(200).json({
    data: {
      user,
    },
  });
};

export const deleteMe: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  await deleteCurrentAccount(
    request.auth.userId,
    requireRefreshToken(request),
    request.body as DeleteAccountInput,
  );
  response.clearCookie(refreshTokenCookieName, getClearRefreshTokenCookieOptions());
  response.status(200).json({
    data: {
      message: 'Your account and associated data have been deleted.',
    },
  });
};

export const resendVerificationEmail: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const status = await requestEmailVerification(request.auth.userId);

  response.status(status === 'sent' ? 202 : 200).json({
    data: {
      status,
    },
  });
};

export const confirmEmailVerification: RequestHandler = async (request, response) => {
  const { token } = request.body as VerifyEmailInput;
  const status = await verifyEmail(token);

  response.status(200).json({
    data: {
      status,
    },
  });
};

export const requestPasswordRecovery: RequestHandler = async (request, response) => {
  const { email } = request.body as RequestPasswordResetInput;

  await requestPasswordReset(email);
  response.status(202).json({
    data: {
      message: 'If an account matches that email, a password reset link will be sent.',
    },
  });
};

export const confirmPasswordReset: RequestHandler = async (request, response) => {
  const { token, password } = request.body as ResetPasswordInput;

  await resetPassword(token, password);
  response.clearCookie(refreshTokenCookieName, getClearRefreshTokenCookieOptions());
  response.status(200).json({
    data: {
      message: 'Your password has been reset. Sign in with your new password.',
    },
  });
};

export const listSessions: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const sessions = await listUserAuthSessions(request.auth.userId, requireRefreshToken(request));
  response.status(200).json({ data: { sessions } });
};

export const revokeSession: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { sessionId } = request.validatedParams as SessionIdParams;
  await revokeUserAuthSession(request.auth.userId, sessionId, requireRefreshToken(request));
  response.status(204).send();
};

export const revokeOtherSessions: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const revokedCount = await revokeOtherUserAuthSessions(
    request.auth.userId,
    requireRefreshToken(request),
  );
  response.status(200).json({ data: { revokedCount } });
};

export const changePassword: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const currentRefreshToken = requireRefreshToken(request);
  const userAgent = request.get('user-agent');
  const ipAddress = request.clientIp ?? request.ip;
  const session = await changeAccountPassword(
    request.auth.userId,
    currentRefreshToken,
    request.body as ChangePasswordInput,
    {
      ...(ipAddress === undefined ? {} : { ipAddress }),
      ...(userAgent === undefined ? {} : { userAgent }),
    },
  );

  response.cookie(refreshTokenCookieName, session.refreshToken, getRefreshTokenCookieOptions());
  response.status(200).json({
    data: {
      message: 'Your password has been updated and other sessions have been signed out.',
    },
  });
};

export const showPendingEmailChange: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const pending = await getPendingEmailChange(request.auth.userId);
  response.status(200).json({ data: { pending } });
};

export const startEmailChange: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { email, password } = request.body as RequestEmailChangeInput;
  const pending = await requestEmailChange(request.auth.userId, email, password);
  response.status(202).json({ data: { pending } });
};

export const resendPendingEmailChange: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const pending = await resendEmailChange(request.auth.userId);
  response.status(202).json({ data: { pending } });
};

export const removePendingEmailChange: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  await cancelEmailChange(request.auth.userId);
  response.status(204).send();
};

export const confirmEmailChange: RequestHandler = async (request, response) => {
  const { token } = request.body as ConfirmEmailChangeInput;
  const cookieValue = request.cookies[refreshTokenCookieName] as unknown;
  const result = await confirmPendingEmailChange(
    token,
    typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : undefined,
  );

  if (!result.currentSessionPreserved) {
    response.clearCookie(refreshTokenCookieName, getClearRefreshTokenCookieOptions());
  }
  try {
    await sendEmailChangedNotice({
      recipientName: result.recipientName,
      recipientEmail: result.previousEmail,
    });
  } catch (error) {
    request.log.warn({ err: error }, 'Email change security notice was not sent');
  }

  response.status(200).json({
    data: {
      status: result.status,
      currentSessionPreserved: result.currentSessionPreserved,
    },
  });
};
