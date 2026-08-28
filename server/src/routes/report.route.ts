import { Router } from 'express';
import { createReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { contentReportRateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate-request.js';
import { createContentReportInputSchema } from '../schemas/report.schema.js';

export const reportRouter = Router();

reportRouter.post(
  '/',
  authenticate,
  contentReportRateLimit,
  validateBody(createContentReportInputSchema),
  createReport,
);
