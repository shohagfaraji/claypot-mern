import { Router } from 'express';
import {
  confirmEmailVerification,
  confirmEmailChange,
  confirmPasswordReset,
  changePassword,
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
import { validateBody, validateParams } from '../middleware/validate-request.js';
import {
  changePasswordInputSchema,
  confirmEmailChangeInputSchema,
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

authRouter.post('/register', validateBody(registerInputSchema), register);
authRouter.post('/login', validateBody(loginInputSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/email-change', authenticate, showPendingEmailChange);
authRouter.post(
  '/email-change/request',
  authenticate,
  validateBody(requestEmailChangeInputSchema),
  startEmailChange,
);
authRouter.post('/email-change/resend', authenticate, resendPendingEmailChange);
authRouter.delete('/email-change', authenticate, removePendingEmailChange);
authRouter.post(
  '/email-change/confirm',
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
  validateBody(requestPasswordResetInputSchema),
  requestPasswordRecovery,
);
authRouter.post(
  '/password-recovery/resend',
  validateBody(requestPasswordResetInputSchema),
  requestPasswordRecovery,
);
authRouter.post(
  '/password-recovery/reset',
  validateBody(resetPasswordInputSchema),
  confirmPasswordReset,
);
authRouter.post(
  '/email-verification/verify',
  validateBody(verifyEmailInputSchema),
  confirmEmailVerification,
);
authRouter.post('/email-verification/resend', authenticate, resendVerificationEmail);
authRouter.get('/me', authenticate, me);
authRouter.patch('/me', authenticate, validateBody(updateProfileInputSchema), updateMe);
