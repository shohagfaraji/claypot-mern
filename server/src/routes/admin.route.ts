import { Router } from 'express';
import {
  changeUserRole,
  listRecipesForAdmin,
  listUsersForAdmin,
  showAdminDashboard,
} from '../controllers/admin.controller.js';
import { listReportsForAdmin, reviewReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  adminUserIdParamsSchema,
  listAdminRecipesQuerySchema,
  listAdminUsersQuerySchema,
  updateAdminUserRoleInputSchema,
} from '../schemas/admin.schema.js';
import {
  contentReportIdParamsSchema,
  listContentReportsQuerySchema,
  reviewContentReportInputSchema,
} from '../schemas/report.schema.js';

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
adminRouter.patch(
  '/users/:userId/role',
  authenticate,
  authorizeRoles('admin'),
  validateParams(adminUserIdParamsSchema),
  validateBody(updateAdminUserRoleInputSchema),
  changeUserRole,
);
adminRouter.get(
  '/reports',
  authenticate,
  authorizeRoles('admin'),
  validateQuery(listContentReportsQuerySchema),
  listReportsForAdmin,
);
adminRouter.patch(
  '/reports/:reportId',
  authenticate,
  authorizeRoles('admin'),
  validateParams(contentReportIdParamsSchema),
  validateBody(reviewContentReportInputSchema),
  reviewReport,
);
