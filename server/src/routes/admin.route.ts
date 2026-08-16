import { Router } from 'express';
import {
  listRecipesForAdmin,
  listUsersForAdmin,
  showAdminDashboard,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';
import { validateQuery } from '../middleware/validate-request.js';
import { listAdminRecipesQuerySchema, listAdminUsersQuerySchema } from '../schemas/admin.schema.js';

export const adminRouter = Router();

adminRouter.get('/dashboard', authenticate, authorizeRoles('admin'), showAdminDashboard);
adminRouter.get(
  '/recipes',
  authenticate,
  authorizeRoles('admin'),
  validateQuery(listAdminRecipesQuerySchema),
  listRecipesForAdmin,
);
adminRouter.get(
  '/users',
  authenticate,
  authorizeRoles('admin'),
  validateQuery(listAdminUsersQuerySchema),
  listUsersForAdmin,
);
