import type { PrismaClient } from '@prisma/client';

import { createApp as createApplication } from '../../app.js';
import { createAuth } from '../auth.js';

export const createTestApp = (db: PrismaClient) => {
  process.env.BETTER_AUTH_SECRET ??=
    '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  process.env.LINE_CLIENT_ID ??= 'line-test-client-id';
  process.env.LINE_CLIENT_SECRET ??= 'line-test-client-secret';
  process.env.LINE_REDIRECT_URI ??= 'http://localhost:3000/auth/callback/line';

  const auth = createAuth(db);

  return createApplication({ db, auth });
};
