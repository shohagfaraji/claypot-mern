import { Router } from 'express';
import {
  confirmEmailVerification,
  confirmEmailChange,
  confirmPasswordReset,
  changePassword,
  deleteMe,
  login,
  logout,
  listSessions,
  me,
  refresh,
  register,
  requestPasswordRecovery,
  removePendingEmailChange,
  resendPendingEmailChange,
  revokeOtherSessions,
  revokeSession,
  showPendingEmailChange,
  startEmailChange,
  resendVerificationEmail,
  updateMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  emailActionRateLimit,
  loginRateLimit,
  passwordRecoveryRateLimit,
  refreshRateLimit,
  registrationRateLimit,
} from '../middleware/rate-limit.js';
import { validateBody, validateParams } from '../middleware/validate-request.js';
import {
  changePasswordInputSchema,
  confirmEmailChangeInputSchema,
  deleteAccountInputSchema,
  loginInputSchema,
  requestPasswordResetInputSchema,
  requestEmailChangeInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  sessionIdParamsSchema,
  updateProfileInputSchema,
  verifyEmailInputSchema,
} from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', registrationRateLimit, validateBody(registerInputSchema), register);
authRouter.post('/login', loginRateLimit, validateBody(loginInputSchema), login);
authRouter.post('/refresh', refreshRateLimit, refresh);
authRouter.post('/logout', logout);
authRouter.get('/email-change', authenticate, showPendingEmailChange);
authRouter.post(
  '/email-change/request',
  authenticate,
  emailActionRateLimit,
  validateBody(requestEmailChangeInputSchema),
  startEmailChange,
);
authRouter.post(
  '/email-change/resend',
  authenticate,
  emailActionRateLimit,
  resendPendingEmailChange,
);
authRouter.delete('/email-change', authenticate, removePendingEmailChange);
authRouter.post(
  '/email-change/confirm',
  emailActionRateLimit,
  validateBody(confirmEmailChangeInputSchema),
  confirmEmailChange,
);
authRouter.patch(
  '/password',
  authenticate,
  validateBody(changePasswordInputSchema),
  changePassword,
);
authRouter.get('/sessions', authenticate, listSessions);
authRouter.delete('/sessions', authenticate, revokeOtherSessions);
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  validateParams(sessionIdParamsSchema),
  revokeSession,
);
authRouter.post(
  '/password-recovery/request',
  passwordRecoveryRateLimit,
  validateBody(requestPasswordResetInputSchema),
  requestPasswordRecovery,
);
authRouter.post(
  '/password-recovery/resend',
  passwordRecoveryRateLimit,
  validateBody(requestPasswordResetInputSchema),
  requestPasswordRecovery,
);
authRouter.post(
  '/password-recovery/reset',
  passwordRecoveryRateLimit,
  validateBody(resetPasswordInputSchema),
  confirmPasswordReset,
);
authRouter.post(
  '/email-verification/verify',
  emailActionRateLimit,
  validateBody(verifyEmailInputSchema),
  confirmEmailVerification,
);
authRouter.post(
  '/email-verification/resend',
  authenticate,
  emailActionRateLimit,
  resendVerificationEmail,
);
authRouter.get('/me', authenticate, me);
authRouter.patch('/me', authenticate, validateBody(updateProfileInputSchema), updateMe);
authRouter.delete('/me', authenticate, validateBody(deleteAccountInputSchema), deleteMe);
