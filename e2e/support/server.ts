import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { clientOrigin, databaseName, mongoVersion, serverOrigin } from './settings.js';

const controlKey = process.env.CLAYPOT_E2E_KEY;
if (!controlKey || controlKey.length < 32) throw new Error('Run this server through Playwright.');

Object.assign(process.env, {
  NODE_ENV: 'test',
  DOTENV_CONFIG_PATH: resolve('e2e/support/disabled.env'),
  CLIENT_ORIGIN: clientOrigin,
  ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'),
  LOG_LEVEL: 'silent',
  TRUST_PROXY_HOPS: '0',
  RESEND_API_KEY: 're_local_test_transport',
  EMAIL_FROM: 'Claypot <mail@example.test>',
  RESEND_BASE_URL: `${serverOrigin}/__mail__`,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: '60',
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: '60',
  EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS: '60',
  LOGIN_RATE_LIMIT_MAX: '1000',
  REGISTRATION_RATE_LIMIT_MAX: '1000',
  PASSWORD_RECOVERY_RATE_LIMIT_MAX: '1000',
  EMAIL_ACTION_RATE_LIMIT_MAX: '1000',
  REFRESH_RATE_LIMIT_MAX: '1000',
  CONTENT_REPORT_RATE_LIMIT_MAX: '1000',
  FOLLOW_ACTION_RATE_LIMIT_MAX: '1000',
});
for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  delete process.env[key];
}

interface TestEmail {
  id: string;
  to: string[];
  subject: string;
  text: string;
}

let replicaSet: MongoMemoryReplSet | undefined;
let server: Server | undefined;
let stopping = false;
const emails: TestEmail[] = [];

async function stop() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 12_000).unref();
  server?.closeAllConnections();
  if (server) await new Promise<void>((done) => server?.close(() => done()));
  try {
    await mongoose.disconnect();
  } finally {
    await replicaSet?.stop();
  }
  clearTimeout(deadline);
}

async function start() {
  replicaSet = new MongoMemoryReplSet({
    binary: { version: mongoVersion, downloadDir: resolve('.cache/mongodb') },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { detached: true } },
  });
  await replicaSet.start();
  process.env.MONGODB_URI = replicaSet.getUri(databaseName);
  const { createApp } = await import('../../server/src/app.js');
  const { connectToDatabase } = await import('../../server/src/config/database.js');
  const { PasswordResetTokenModel } = await import(
    '../../server/src/models/password-reset-token.model.js'
  );
  const { resetData } = await import('./seed.js');
  await connectToDatabase();
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const app = express();
  app.use('/__test__', express.json());
  app.use('/__mail__', express.json());
  app.get('/__test__/ready', (_request, response) => response.json({ ready: true }));
  app.use('/__test__', (request, response, next) => {
    if (request.get('x-test-key') !== controlKey) {
      response.sendStatus(403);
      return;
    }
    response.set('Cache-Control', 'no-store');
    next();
  });
  app.post('/__test__/reset', async (_request, response) => {
    emails.length = 0;
    await resetData();
    response.sendStatus(204);
  });
  app.get('/__test__/emails', (_request, response) => response.json({ emails }));
  app.post('/__test__/password-token/age', async (request, response) => {
    const { userId, expire } = request.body as { userId: string; expire?: boolean };
    if (!mongoose.isObjectIdOrHexString(userId)) {
      response.sendStatus(400);
      return;
    }
    await PasswordResetTokenModel.updateOne(
      { user: userId },
      { $set: { updatedAt: new Date(0), ...(expire ? { expiresAt: new Date(0) } : {}) } },
      { timestamps: false },
    );
    response.sendStatus(204);
  });
  app.post('/__mail__/emails', (request, response) => {
    if (request.get('authorization') !== 'Bearer re_local_test_transport') {
      response.sendStatus(403);
      return;
    }
    const body = request.body as Omit<TestEmail, 'id' | 'to'> & { to: string | string[] };
    const id = randomUUID();
    emails.push({
      id,
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject,
      text: body.text,
    });
    response.json({ id });
  });
  app.use(createApp());
  server = app.listen(Number(new URL(serverOrigin).port), '127.0.0.1');
  server.on('error', (error) => {
    console.error(error);
    void stop().then(() => process.exit(1));
  });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void stop().then(() => process.exit(0)));
}
void start().catch(async (error: unknown) => {
  console.error(error);
  await stop();
  process.exit(1);
});
