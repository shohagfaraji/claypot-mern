import { Router } from 'express';
import { login, logout, me, refresh, register, updateMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate-request.js';
import {
  loginInputSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerInputSchema), register);
authRouter.post('/login', validateBody(loginInputSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.patch('/me', authenticate, validateBody(updateProfileInputSchema), updateMe);
