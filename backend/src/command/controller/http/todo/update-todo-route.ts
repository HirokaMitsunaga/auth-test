import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { EntityId } from '../../../domain/todo/entity-id.vo.js';
import { PriorityVO } from '../../../domain/todo/priority.vo.js';
import { TitleVO } from '../../../domain/todo/title.vo.js';
import type { UpdateTodoUseCase } from '../../../usecase/todo/update-todo.use-case.js';
import { TodoRequestSchema } from './todo.schema.js';

const route = createRoute({
  method: 'put',
  path: '/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({
        example: '01J123456789ABCDEFGHJKMNPQ',
      }),
    }),
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
      description: 'Todo updated successfully',
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
      description: 'Todo or User not found',
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

export const updateTodoRoute = ({
  app,
  updateTodoUseCase,
}: {
  app: OpenAPIHono;
  updateTodoUseCase: UpdateTodoUseCase;
}) => {
  app.openapi(route, async (c) => {
    const { id } = c.req.valid('param');
    const request = c.req.valid('json');

    await updateTodoUseCase.execute({
      id: EntityId.create({ entityId: id }),
      title: TitleVO.create(request.title),
      userId: EntityId.create({ entityId: request.userId }),
      status: request.status,
      priority: PriorityVO.create(request.priority),
    });

    return c.body(null, 204);
  });
};
