import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  request.log.error({ err: error }, 'Unhandled request error');

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong.',
    },
  });
};
