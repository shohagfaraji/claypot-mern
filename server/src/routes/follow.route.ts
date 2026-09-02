import { Router } from 'express';
import { create, feed, remove, status } from '../controllers/follow.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { followActionRateLimit } from '../middleware/rate-limit.js';
import { validateParams, validateQuery } from '../middleware/validate-request.js';
import { followUserIdParamsSchema } from '../schemas/follow.schema.js';
import { listRecipesQuerySchema } from '../schemas/recipe.schema.js';

export const followRouter = Router();
export const feedRouter = Router();

followRouter.use(authenticate);
followRouter.get('/:userId/status', validateParams(followUserIdParamsSchema), status);
followRouter.post(
  '/:userId',
  followActionRateLimit,
  validateParams(followUserIdParamsSchema),
  create,
);
followRouter.delete(
  '/:userId',
  followActionRateLimit,
  validateParams(followUserIdParamsSchema),
  remove,
);

feedRouter.get('/', authenticate, validateQuery(listRecipesQuerySchema), feed);
