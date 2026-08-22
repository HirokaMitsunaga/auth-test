import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ulid } from 'ulid';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('update-user', () => {
  let userId: string;
  let email: string;

  beforeEach(async () => {
    userId = ulid();
    email = `${userId}@example.com`;
    await prisma.user.create({
      data: {
        id: userId,
        name: '更新前ユーザー',
        email,
        password: 'before-password',
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('【正常系】Userを更新してDBに保存する', async () => {
    const updatedEmail = `updated-${userId}@example.com`;
    const response = await createApp(prisma).request(`/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '更新後ユーザー',
        email: updatedEmail,
        password: 'after-password',
      }),
    });

    expect(response.status).toBe(204);
    await expect(
      prisma.user.findUnique({ where: { id: userId } }),
    ).resolves.toMatchObject({
      id: userId,
      name: '更新後ユーザー',
      email: updatedEmail,
      password: 'after-password',
    });
  });

  it('【異常系】不正なリクエストは400とエラー形式を返す', async () => {
    const response = await createApp(prisma).request(`/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '更新後ユーザー', email }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Validation Error',
    });
  });

  it('【異常系】存在しないUserを更新しようとすると404とエラー形式を返す', async () => {
    const missingUserId = ulid();
    const response = await createApp(prisma).request(
      `/users/${missingUserId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '更新後ユーザー',
          email: 'missing@example.com',
          password: 'password',
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: `User: ${missingUserId} not found`,
    });
  });

  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const response = await createApp(prisma).request(`/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '更新後\u0000ユーザー',
        email,
        password: 'password',
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Internal Server Error',
    });
  });
});
