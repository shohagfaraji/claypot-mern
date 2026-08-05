import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType): RequestHandler {
  return async (request, _response, next) => {
    try {
      request.body = await schema.parseAsync(request.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return async (request, _response, next) => {
    try {
      request.validatedQuery = await schema.parseAsync(request.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}
