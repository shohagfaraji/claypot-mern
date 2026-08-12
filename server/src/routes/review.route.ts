import { Router } from 'express';
import { remove, update } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams } from '../middleware/validate-request.js';
import { reviewIdParamsSchema, updateReviewInputSchema } from '../schemas/review.schema.js';

export const reviewRouter = Router();

reviewRouter.patch(
  '/:reviewId',
  authenticate,
  validateParams(reviewIdParamsSchema),
  validateBody(updateReviewInputSchema),
  update,
);
reviewRouter.delete('/:reviewId', authenticate, validateParams(reviewIdParamsSchema), remove);
