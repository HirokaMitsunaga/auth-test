import { OpenAPIHono } from '@hono/zod-openapi';

import type { ReadTodoUseCase } from '../../../usecase/todo/read-todo.use-case.js';
import { readTodoRoute } from './read-todo-route.js';

export const createTodoQueryRoute = ({
  readTodoUseCase,
}: {
  readTodoUseCase: ReadTodoUseCase;
}) => {
  const todoQueryRoute = new OpenAPIHono();

  readTodoRoute({ app: todoQueryRoute, readTodoUseCase });

  return todoQueryRoute;
};
