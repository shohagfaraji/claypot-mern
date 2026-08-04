import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate-request.js';
import { loginInputSchema, registerInputSchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerInputSchema), register);
authRouter.post('/login', validateBody(loginInputSchema), login);
