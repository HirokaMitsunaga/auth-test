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

describe('delete-todo', () => {
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
        title: '削除対象のTodo',
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

  it('【正常系】Todoを削除してDBから削除する', async () => {
    const app = createApp(prisma);

    const response = await app.request(`/todos/${todoId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
    await expect(
      prisma.todo.findUnique({ where: { id: todoId } }),
    ).resolves.toBeNull();
  });

  it('【異常系】存在しないTodoを削除しようとすると404とエラー形式を返す', async () => {
    const app = createApp(prisma);
    const missingTodoId = ulid();

    const response = await app.request(`/todos/${missingTodoId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: `ToDo: ${missingTodoId} not found`,
    });
  });

  it('【異常系】不正なTodo IDを指定すると400とエラー形式を返す', async () => {
    const app = createApp(prisma);

    const response = await app.request('/todos/invalid-id', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Invalid ID format: invalid-id',
    });
  });

  //削除はidしか存在しないため、PostgreSQLトリガーで削除エラーを一時的に再現する
  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const app = createApp(prisma);
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION raise_delete_todo_error()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.id = '${todoId}' THEN
          RAISE EXCEPTION 'Intentional delete error';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER delete_todo_error_trigger
      BEFORE DELETE ON "Todo"
      FOR EACH ROW EXECUTE FUNCTION raise_delete_todo_error();
    `);

    try {
      const response = await app.request(`/todos/${todoId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        message: 'Internal Server Error',
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS delete_todo_error_trigger ON "Todo";',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS raise_delete_todo_error();',
      );
    }
  });
});
