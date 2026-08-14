import { Router } from 'express';
import { showAdminDashboard } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorize.js';

export const adminRouter = Router();

adminRouter.get('/dashboard', authenticate, authorizeRoles('admin'), showAdminDashboard);
