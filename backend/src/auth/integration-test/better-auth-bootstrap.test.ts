import { afterAll, describe, expect, it } from 'vitest';

import { createTestApp } from './create-test-app.js';
import { prisma } from '../../prisma.js';

process.env.BETTER_AUTH_SECRET ??=
  '74AwruzrCGHkjudV5NCjxm1hUuEQ058Wd/b9px/uFZU=';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.LINE_CLIENT_ID ??= 'line-test-client-id';
process.env.LINE_CLIENT_SECRET ??= 'line-test-client-secret';
process.env.LINE_REDIRECT_URI ??= 'http://localhost:3000/auth/callback/line';

describe('Better Auth 最小構成', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([
    ['/auth/line-login-test', 'LINE Login Test'],
    ['/auth/login-complete', 'LINEログイン成功'],
    ['/auth/login-error', 'LINEログイン失敗'],
  ])(
    '【正常系】開発用LINEログイン画面を表示できる: %s',
    async (path, title) => {
      const app = createTestApp(prisma);

      const response = await app.request(path);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(await response.text()).toContain(title);
    },
  );

  it('【正常系】認証コールバックを/auth配下へ接続できる', async () => {
    const app = createTestApp(prisma);

    const response = await app.request(
      '/auth/callback/line?code=code&state=invalid-state',
    );

    expect(response.status).toBe(302);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
      '/auth/error',
    );
  });

  it.each([
    {
      description: 'GET/POST以外の認証リクエストを受け付けない',
      path: '/auth/sign-in/social',
      options: { method: 'PUT' },
    },
    {
      description: '定義されていない認証パスを受け付けない',
      path: '/auth/not-defined',
      options: { method: 'GET' },
    },
  ])('【異常系】$description', async ({ path, options }) => {
    const app = createTestApp(prisma);

    const response = await app.request(path, options);

    expect(response.status).toBe(404);
  });
});
