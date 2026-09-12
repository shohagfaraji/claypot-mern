import mongoose from 'mongoose';
import * as models from '../models/index.js';
import { logger } from './logger.js';

export async function prepareDatabase(): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) throw new Error('Connect to MongoDB before preparing the database.');
  const topology = await database.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    throw new Error('Claypot requires a MongoDB replica set or sharded cluster for transactions.');
  }
  for (const model of Object.values(models)) {
    await model.createIndexes();
  }
  logger.info('Database indexes are ready');
}
