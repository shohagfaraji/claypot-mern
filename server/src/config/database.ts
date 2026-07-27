import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export type DatabaseStatus =
  | 'disconnected'
  | 'connected'
  | 'connecting'
  | 'disconnecting'
  | 'unknown';

export function getDatabaseStatus(
  readyState: number = mongoose.connection.readyState,
): DatabaseStatus {
  const states: Record<number, DatabaseStatus> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return states[readyState] ?? 'unknown';
}

export function isDatabaseReady(): boolean {
  return getDatabaseStatus() === 'connected';
}

export async function connectToDatabase(): Promise<void> {
  mongoose.set('bufferCommands', false);

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production',
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });

  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost');
});

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
});
