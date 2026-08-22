import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ReadTodoUseCase } from '../../../usecase/todo/read-todo.use-case.js';
import { TodoListResponseSchema, TodoRequestSchema } from './todo.schema.js';

const route = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: TodoRequestSchema,
  },
  responses: {
    200: {
      description: 'Todos retrieved successfully',
      content: {
        'application/json': {
          schema: TodoListResponseSchema,
        },
      },
    },
    503: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

export const readTodoRoute = ({
  app,
  readTodoUseCase,
}: {
  app: OpenAPIHono;
  readTodoUseCase: ReadTodoUseCase;
}) => {
  app.openapi(route, async (c) => {
    const { userId, limit, cursor, title } = c.req.valid('query');
    const { todos, nextCursor } = await readTodoUseCase.execute({
      userId,
      limit,
      cursor,
      title,
    });

    return c.json(
      {
        todos: todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          userId: todo.userId,
          status: todo.status,
          priority: todo.priority,
          updatedAt: todo.updatedAt.toISOString(),
        })),
        nextCursor,
      },
      200,
    );
  });
};
