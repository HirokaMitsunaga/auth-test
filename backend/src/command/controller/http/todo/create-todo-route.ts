import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { TodoRequestSchema } from './todo.schema.js';
import type { CreateTodoUseCase } from '../../../usecase/todo/create-todo.use-case.js';
import { TitleVO } from '../../../domain/todo/title.vo.js';
import { EntityId } from '../../../domain/todo/entity-id.vo.js';
import { PriorityVO } from '../../../domain/todo/priority.vo.js';

const route = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: TodoRequestSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: 'Todo created successfully',
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'User Not Found',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
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

export const createTodoRoute = ({
  app,
  createTodoUseCase,
}: {
  app: OpenAPIHono;
  createTodoUseCase: CreateTodoUseCase;
}) => {
  app.openapi(route, async (c) => {
    const request = c.req.valid('json');
    await createTodoUseCase.execute({
      title: TitleVO.create(request.title),
      userId: EntityId.create({ entityId: request.userId }),
      status: request.status,
      priority: PriorityVO.create(request.priority),
    });
    return c.body(null, 204);
  });
};
