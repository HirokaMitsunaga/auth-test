import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ulid } from 'ulid';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('create-todo', () => {
  const userId = ulid();
  let todoTitle: string | undefined;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: userId,
        name: '結合テストユーザー',
        email: `${userId}@example.com`,
        password: 'password',
      },
    });
  });

  afterEach(async () => {
    if (todoTitle) {
      await prisma.todo.deleteMany({ where: { title: todoTitle, userId } });
      todoTitle = undefined;
    }
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('【正常系】Todoを作成してDBに保存する', async () => {
    const app = createApp(prisma);
    todoTitle = `Todo作成結合テスト-${Date.now()}`;

    const response = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: todoTitle,
        userId,
        status: 'PENDING',
        priority: 5,
      }),
    });

    expect(response.status).toBe(204);

    await expect(
      prisma.todo.findFirst({
        where: { title: todoTitle, userId },
      }),
    ).resolves.toMatchObject({
      title: todoTitle,
      userId,
      status: 'PENDING',
      priority: 5,
    });
  });

  it('【異常系】不正なリクエストは400とエラー形式を返す', async () => {
    const app = createApp(prisma);

    const response = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '牛乳を買う',
        userId,
        status: 'PENDING',
        priority: 5.5,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Validation Error',
    });
  });

  it('【異常系】存在しないユーザーを指定すると404とエラー形式を返す', async () => {
    const app = createApp(prisma);
    const missingUserId = ulid();

    const response = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '牛乳を買う',
        userId: missingUserId,
        status: 'PENDING',
        priority: 5,
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: `User: ${missingUserId} not found`,
    });
  });

  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const app = createApp(prisma);

    const response = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '牛乳\u0000を買う',
        userId,
        status: 'PENDING',
        priority: 5,
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Internal Server Error',
    });
  });
});
