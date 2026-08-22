import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('create-user', () => {
  const emails: string[] = [];

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    emails.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】Userを作成してDBに保存する', async () => {
    const app = createApp(prisma);
    const email = `create-user-${Date.now()}@example.com`;
    emails.push(email);

    const response = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '作成テストユーザー',
        email,
        password: 'password',
      }),
    });

    expect(response.status).toBe(204);
    await expect(
      prisma.user.findUnique({ where: { email } }),
    ).resolves.toMatchObject({
      name: '作成テストユーザー',
      email,
      password: 'password',
    });
  });

  it('【異常系】不正なリクエストは400とエラー形式を返す', async () => {
    const response = await createApp(prisma).request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '作成テストユーザー',
        email: 'test@example.com',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Validation Error',
    });
  });

  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const response = await createApp(prisma).request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '作成\u0000テストユーザー',
        email: 'invalid@example.com',
        password: 'password',
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Internal Server Error',
    });
  });
});
