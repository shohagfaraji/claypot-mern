import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { healthRouter } from './routes/health.route.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
      genReqId(request, response) {
        const headerRequestId = request.headers['x-request-id'];
        const requestId = typeof headerRequestId === 'string' ? headerRequestId : randomUUID();

        response.setHeader('X-Request-Id', requestId);

        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
