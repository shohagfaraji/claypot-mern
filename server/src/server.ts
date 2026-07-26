import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down API');

  const forceShutdown = setTimeout(() => {
    logger.error('API shutdown timed out');
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);

  forceShutdown.unref();

  server.close((error) => {
    clearTimeout(forceShutdown);

    if (error) {
      logger.error({ err: error }, 'Failed to close API server');
      process.exit(1);
    }

    logger.info('API stopped');
    process.exit(0);
  });
}

const server: Server = app.listen(env.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, 'Failed to start API');
    process.exit(1);
  }

  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'API listening');
});

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
