import { Router } from 'express';
import {
  list,
  markAllRead,
  markRead,
  unreadCount,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateParams, validateQuery } from '../middleware/validate-request.js';
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
} from '../schemas/notification.schema.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', validateQuery(listNotificationsQuerySchema), list);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.patch('/read-all', markAllRead);
notificationRouter.patch(
  '/:notificationId/read',
  validateParams(notificationIdParamsSchema),
  markRead,
);
