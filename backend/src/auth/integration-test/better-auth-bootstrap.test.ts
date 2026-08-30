import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { AuthController } from '../controller/http/auth.controller.js';
import { createBetterAuth } from '../infra/better-auth/better-auth-config.js';
import { BetterAuthHandler } from '../infra/better-auth/better-auth-handler.js';
import { HandleAuthUseCase } from '../usecase/handle-auth.use-case.js';
import { prisma } from '../../prisma.js';

process.env.BETTER_AUTH_SECRET ??=
  '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

describe('Better Auth 最小構成', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】認証ハンドラーを/auth配下へ接続できる', async () => {
    const auth = createBetterAuth(prisma);
    const authHandler = new BetterAuthHandler(auth);
    const authUseCase = new HandleAuthUseCase(authHandler);
    const authController = new AuthController(authUseCase);
    const app = createApp({ db: prisma, authController });

    const response = await app.request('/auth/get-session');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
