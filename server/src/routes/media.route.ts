import { Router } from 'express';
import { createUploadSignature } from '../controllers/media.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate-request.js';
import { createImageUploadSignatureInputSchema } from '../schemas/media.schema.js';

export const mediaRouter = Router();

mediaRouter.post(
  '/images/signature',
  authenticate,
  validateBody(createImageUploadSignatureInputSchema),
  createUploadSignature,
);
