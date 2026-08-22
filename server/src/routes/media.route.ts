import { Router } from 'express';
import { createUploadSignature, discardImage } from '../controllers/media.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { mediaRateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate-request.js';
import {
  createImageUploadSignatureInputSchema,
  discardImageInputSchema,
} from '../schemas/media.schema.js';

export const mediaRouter = Router();

mediaRouter.post(
  '/images/signature',
  authenticate,
  mediaRateLimit,
  validateBody(createImageUploadSignatureInputSchema),
  createUploadSignature,
);
mediaRouter.delete(
  '/images',
  authenticate,
  mediaRateLimit,
  validateBody(discardImageInputSchema),
  discardImage,
);
