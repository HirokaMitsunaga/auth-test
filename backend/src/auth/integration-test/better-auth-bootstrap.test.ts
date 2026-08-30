import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { createAuthRoute } from '../controller/http/auth.route.js';
import { createBetterAuth } from '../infra/better-auth/better-auth-config.js';
import { prisma } from '../../prisma.js';

process.env.BETTER_AUTH_SECRET ??=
  '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

describe('Better Auth 最小構成', () => {
  it('【正常系】認証ハンドラーを/auth配下へ接続できる', async () => {
    const app = new Hono();
    app.route('/auth', createAuthRoute(createBetterAuth(prisma)));

    const response = await app.request('/auth/get-session');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
