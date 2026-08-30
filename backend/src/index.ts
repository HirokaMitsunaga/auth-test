import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { AuthController } from './auth/controller/http/auth.controller.js';
import { BetterAuthHandler } from './auth/infra/better-auth/better-auth-handler.js';
import { createBetterAuth } from './auth/infra/better-auth/better-auth-config.js';
import { HandleAuthUseCase } from './auth/usecase/handle-auth.use-case.js';
import { prisma } from './prisma.js';

const auth = createBetterAuth(prisma);
const authHandler = new BetterAuthHandler(auth);
const authUseCase = new HandleAuthUseCase(authHandler);
const authController = new AuthController(authUseCase);

const app = createApp({ db: prisma, authController });

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
