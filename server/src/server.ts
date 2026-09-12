import type { Server } from 'node:http';
import { createApp } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './config/database.js';
import { prepareDatabase } from './config/database-indexes.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();
let server: Server | undefined;
let isShuttingDown = false;

async function closeServer(): Promise<void> {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Shutting down API');

  const forceShutdown = setTimeout(() => {
    logger.error('API shutdown timed out');
    server?.closeAllConnections();
    process.exit(1);
  }, 10_000);

  forceShutdown.unref();

  try {
    await closeServer();
    await disconnectFromDatabase();
    clearTimeout(forceShutdown);
    logger.info('API stopped');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdown);
    logger.error({ err: error }, 'Failed to stop API cleanly');
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  await connectToDatabase();
  await prepareDatabase();

  await new Promise<void>((resolve, reject) => {
    server = app.listen(env.PORT, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'API listening');
}

process.once('SIGINT', (signal) => {
  void shutdown(signal);
});

process.once('SIGTERM', (signal) => {
  void shutdown(signal);
});

void startServer().catch(async (error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start API');
  await disconnectFromDatabase();
  process.exit(1);
});
