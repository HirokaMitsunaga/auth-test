import type { PrismaClient } from '@prisma/client';

import { createApp as createApplication } from '../../app.js';
import { AuthController } from '../controller/http/auth.controller.js';
import { BetterAuthHandler } from '../infra/better-auth/better-auth-handler.js';
import { createBetterAuth } from '../infra/better-auth/better-auth-config.js';
import { HandleAuthUseCase } from '../usecase/handle-auth.use-case.js';

export const createTestApp = (db: PrismaClient) => {
  process.env.BETTER_AUTH_SECRET ??=
    '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

  const auth = createBetterAuth(db);
  const authHandler = new BetterAuthHandler(auth);
  const authUseCase = new HandleAuthUseCase(authHandler);
  const authController = new AuthController(authUseCase);

  return createApplication({ db, authController });
};
