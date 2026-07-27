import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate-request.js';
import { registerInputSchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerInputSchema), register);
