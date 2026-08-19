import { Router } from 'express';
import {
  confirmEmailVerification,
  confirmPasswordReset,
  login,
  logout,
  me,
  refresh,
  register,
  requestPasswordRecovery,
  resendVerificationEmail,
  updateMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate-request.js';
import {
  loginInputSchema,
  requestPasswordResetInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  updateProfileInputSchema,
  verifyEmailInputSchema,
} from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerInputSchema), register);
authRouter.post('/login', validateBody(loginInputSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
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
