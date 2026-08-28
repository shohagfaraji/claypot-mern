import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type {
  ContentReportIdParams,
  CreateContentReportInput,
  ListContentReportsQuery,
  ReviewContentReportInput,
} from '../schemas/report.schema.js';
import {
  createContentReport,
  listContentReports,
  reviewContentReport,
} from '../services/report.service.js';

export const createReport: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const report = await createContentReport(
    request.auth.userId,
    request.body as CreateContentReportInput,
  );
  response.status(201).json({ data: { report } });
};

export const listReportsForAdmin: RequestHandler = async (request, response) => {
  const result = await listContentReports(request.validatedQuery as ListContentReportsQuery);
  response.status(200).json({
    data: { reports: result.items, pagination: result.pagination },
  });
};

export const reviewReport: RequestHandler = async (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { reportId } = request.validatedParams as ContentReportIdParams;
  const report = await reviewContentReport(
    reportId,
    request.auth.userId,
    request.body as ReviewContentReportInput,
  );
  response.status(200).json({ data: { report } });
};
