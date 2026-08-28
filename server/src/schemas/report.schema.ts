import { z } from 'zod';
import {
  contentReportReasons,
  contentReportStatuses,
  contentReportTargetTypes,
} from '../models/content-report.model.js';

const objectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{24}$/, 'Content identifier is invalid.');

export const createContentReportInputSchema = z
  .strictObject({
    targetType: z.enum(contentReportTargetTypes),
    targetId: objectIdSchema,
    reason: z.enum(contentReportReasons),
    details: z
      .string()
      .trim()
      .min(10, 'Additional details must contain at least 10 characters.')
      .max(500, 'Additional details cannot exceed 500 characters.')
      .nullable()
      .optional(),
  })
  .superRefine((input, context) => {
    if (input.reason === 'other' && !input.details) {
      context.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Add details when selecting another reason.',
      });
    }
  });

export const listContentReportsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(contentReportStatuses).optional(),
  targetType: z.enum(contentReportTargetTypes).optional(),
  reason: z.enum(contentReportReasons).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export const contentReportIdParamsSchema = z.strictObject({
  reportId: objectIdSchema,
});

export const reviewContentReportInputSchema = z.strictObject({
  status: z.enum(['resolved', 'dismissed']),
  note: z
    .string()
    .trim()
    .min(10, 'Resolution notes must contain at least 10 characters.')
    .max(500, 'Resolution notes cannot exceed 500 characters.'),
});

export type CreateContentReportInput = z.infer<typeof createContentReportInputSchema>;
export type ListContentReportsQuery = z.infer<typeof listContentReportsQuerySchema>;
export type ContentReportIdParams = z.infer<typeof contentReportIdParamsSchema>;
export type ReviewContentReportInput = z.infer<typeof reviewContentReportInputSchema>;
