import { Router } from 'express';
import { cooks, facets } from '../controllers/discovery.controller.js';
import { validateQuery } from '../middleware/validate-request.js';
import { listCooksQuerySchema } from '../schemas/discovery.schema.js';

export const discoveryRouter = Router();

discoveryRouter.get('/facets', facets);
discoveryRouter.get('/cooks', validateQuery(listCooksQuerySchema), cooks);
