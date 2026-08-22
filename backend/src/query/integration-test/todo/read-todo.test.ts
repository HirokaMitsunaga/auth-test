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

describe('read-todo', () => {
  const userId = ulid();
  const otherUserId = ulid();
  let todoId: string;
  let nextTodoId: string;
  let otherTodoId: string;
  let title: string;
  let updatedAt: Date;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: userId,
        name: '結合テストユーザー',
        email: `${userId}@example.com`,
        password: 'password',
      },
    });
    await prisma.user.create({
      data: {
        id: otherUserId,
        name: '別の結合テストユーザー',
        email: `${otherUserId}@example.com`,
        password: 'password',
      },
    });
  });

  beforeEach(async () => {
    todoId = ulid();
    title = `${todoId} 取得対象のTodo`;
    const todo = await prisma.todo.create({
      data: {
        id: todoId,
        title,
        userId,
        status: 'PENDING',
        priority: 5,
      },
    });
    updatedAt = todo.updatedAt;

    nextTodoId = ulid();
    await prisma.todo.create({
      data: {
        id: nextTodoId,
        title: `${nextTodoId} ページング対象のTodo`,
        userId,
        status: 'PENDING',
        priority: 5,
      },
    });

    otherTodoId = ulid();
    await prisma.todo.create({
      data: {
        id: otherTodoId,
        title: `${otherTodoId} 別ユーザーのTodo`,
        userId: otherUserId,
        status: 'PENDING',
        priority: 5,
      },
    });
  });

  afterEach(async () => {
    await prisma.todo.deleteMany({
      where: { id: { in: [todoId, nextTodoId, otherTodoId] } },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  it('【正常系】指定したUserのTodoを取得する', async () => {
    const response = await createApp(prisma).request(`/todos?userId=${userId}`);
    const body = (await response.json()) as { todos: unknown[] };

    expect(response.status).toBe(200);
    expect(body.todos).toEqual(
      expect.arrayContaining([
        {
          id: todoId,
          title,
          userId,
          status: 'PENDING',
          priority: 5,
          updatedAt: updatedAt.toISOString(),
        },
      ]),
    );
    expect(body.todos).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: otherTodoId })]),
    );
  });

  it('【正常系】titleで部分一致検索したTodoを取得する', async () => {
    const response = await createApp(prisma).request(
      `/todos?userId=${userId}&title=${todoId}`,
    );
    const body = (await response.json()) as { todos: unknown[] };

    expect(response.status).toBe(200);
    expect(body.todos).toEqual([
      expect.objectContaining({
        id: todoId,
        title,
      }),
    ]);
  });

  it('【正常系】カーソルを使って次のページのTodoを取得する', async () => {
    const expectedTodos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      take: 2,
    });
    const app = createApp(prisma);
    const response = await app.request(`/todos?userId=${userId}&limit=1`);
    const firstPage = (await response.json()) as {
      todos: { id: string }[];
      nextCursor?: string;
    };
    const nextResponse = await app.request(
      `/todos?userId=${userId}&limit=1&cursor=${firstPage.nextCursor}`,
    );
    const nextPage = (await nextResponse.json()) as {
      todos: { id: string }[];
      nextCursor?: string;
    };

    expect(response.status).toBe(200);
    expect(firstPage.todos).toEqual([
      expect.objectContaining({ id: expectedTodos[0]?.id }),
    ]);
    expect(firstPage.nextCursor).toBe(expectedTodos[0]?.id);
    expect(nextResponse.status).toBe(200);
    expect(nextPage.todos).toEqual([
      expect.objectContaining({ id: expectedTodos[1]?.id }),
    ]);
    expect(nextPage.nextCursor).toBeUndefined();
  });

  // PostgreSQLにはSELECTトリガーがないため、テーブル名を一時的に変更して取得エラーを再現する
  it('【異常系】DBエラーが発生すると503とエラー形式を返す', async () => {
    const app = createApp(prisma);
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Todo" RENAME TO "TodoForReadError";',
    );

    try {
      const response = await app.request(`/todos?userId=${userId}`);

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        message: 'Internal Server Error',
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "TodoForReadError" RENAME TO "Todo";',
      );
    }
  });
});
