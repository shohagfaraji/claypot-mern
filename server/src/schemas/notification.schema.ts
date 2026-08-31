import { z } from 'zod';

const objectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{24}$/, 'Notification ID is invalid.');

export const listNotificationsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  status: z.enum(['unread']).optional(),
});

export const notificationIdParamsSchema = z.strictObject({
  notificationId: objectIdSchema,
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
