import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { ulid } from 'ulid';

import { createApp } from '../../../app.js';

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(new URL('../../../../.env', import.meta.url));
}

const { prisma } = await import('../../../prisma.js');

describe('update-todo', () => {
  const userId = ulid();
  let todoId: string;

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

  beforeEach(async () => {
    todoId = ulid();
    await prisma.todo.create({
      data: {
        id: todoId,
        title: '更新前のタイトル',
        userId,
        status: 'PENDING',
        priority: 1,
      },
    });
  });

  afterEach(async () => {
    await prisma.todo.deleteMany({ where: { id: todoId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('【正常系】Todoを更新してDBに保存する', async () => {
    const app = createApp(prisma);

    const response = await app.request(`/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '更新後のタイトル',
        userId,
        status: 'COMPLETED',
        priority: 5,
      }),
    });

    expect(response.status).toBe(204);
    await expect(
      prisma.todo.findUnique({ where: { id: todoId } }),
    ).resolves.toMatchObject({
      id: todoId,
      title: '更新後のタイトル',
      userId,
      status: 'COMPLETED',
      priority: 5,
    });
  });

  it('【異常系】不正なリクエストは400とエラー形式を返す', async () => {
    const app = createApp(prisma);

    const response = await app.request(`/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '更新後のタイトル',
        userId,
        status: 'COMPLETED',
        priority: 5.5,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Validation Error',
    });
  });

  it('【異常系】存在しないTodoを更新しようとすると404とエラー形式を返す', async () => {
    const app = createApp(prisma);
    const missingTodoId = ulid();

    const response = await app.request(`/todos/${missingTodoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '更新後のタイトル',
        userId,
        status: 'COMPLETED',
        priority: 5,
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: `ToDo: ${missingTodoId} not found`,
    });
  });

  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const app = createApp(prisma);

    const response = await app.request(`/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '更新後\u0000のタイトル',
        userId,
        status: 'COMPLETED',
        priority: 5,
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Internal Server Error',
    });
  });
});
