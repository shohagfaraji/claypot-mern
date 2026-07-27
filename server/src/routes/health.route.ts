import { Router } from 'express';
import { getDatabaseStatus, isDatabaseReady } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    status: 'ok',
    service: 'claypot-api',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', (_request, response) => {
  const database = getDatabaseStatus();
  const ready = isDatabaseReady();

  response.setHeader('Cache-Control', 'no-store');
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'unavailable',
    checks: {
      database,
    },
  });
});
