import { OpenAPIHono } from '@hono/zod-openapi';
import type { PrismaClient } from '@prisma/client';

import { TodoQueryServicePrisma } from '../../../infra/todo-query-service.prisma.js';
import { ReadTodoUseCase } from '../../../usecase/todo/read-todo.use-case.js';
import { readTodoRoute } from './read-todo-route.js';

export const createTodoQueryApp = ({
  prisma,
}: {
  prisma: Pick<PrismaClient, 'todo'>;
}) => {
  const todoQueryApp = new OpenAPIHono();
  const todoQueryService = new TodoQueryServicePrisma(prisma);
  const readTodoUseCase = new ReadTodoUseCase(todoQueryService);

  readTodoRoute({ app: todoQueryApp, readTodoUseCase });

  return todoQueryApp;
};
