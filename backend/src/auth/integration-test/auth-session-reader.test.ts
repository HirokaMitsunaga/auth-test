import { afterAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { requireAuthenticatedUser } from '../controller/http/require-authenticated-user.middleware.js';
import { createBetterAuth } from '../infra/better-auth/better-auth-config.js';
import { BetterAuthSessionReader } from '../infra/better-auth/better-auth-session-reader.js';
import { GetAuthenticatedUserUseCase } from '../usecase/get-authenticated-user.use-case.js';
import type { AuthenticatedUserEnv } from '../controller/http/require-authenticated-user.middleware.js';
import { prisma } from '../../prisma.js';

process.env.BETTER_AUTH_SECRET ??=
  '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

const auth = createBetterAuth(prisma);
const sessionReader = new BetterAuthSessionReader(auth);
const getAuthenticatedUserUseCase = new GetAuthenticatedUserUseCase(
  sessionReader,
);

describe('認証セッション取得', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】セッションがない場合は認証ユーザーを返さない', async () => {
    await expect(
      getAuthenticatedUserUseCase.execute({ headers: new Headers() }),
    ).resolves.toBeUndefined();
  });

  it('【異常系】未認証リクエストを401で拒否する', async () => {
    const app = new Hono<AuthenticatedUserEnv>();
    app.use('*', requireAuthenticatedUser(getAuthenticatedUserUseCase));
    app.get('/', (c) => c.json({ userId: c.get('authenticatedUser').id }, 200));

    const response = await app.request('/');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: 'Unauthorized',
    });
  });
});
