import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { EntityId } from '../../../domain/todo/entity-id.vo.js';
import type { DeleteTodoUseCase } from '../../../usecase/todo/delete-todo.use-case.js';

const route = createRoute({
  method: 'delete',
  path: '/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({
        example: '01J123456789ABCDEFGHJKMNPQ',
      }),
    }),
  },
  responses: {
    204: {
      description: 'Todo deleted successfully',
    },
    400: {
      description: 'Invalid Todo ID format',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Todo not found',
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

export const deleteTodoRoute = ({
  app,
  deleteTodoUseCase,
}: {
  app: OpenAPIHono;
  deleteTodoUseCase: DeleteTodoUseCase;
}) => {
  app.openapi(route, async (c) => {
    const { id } = c.req.valid('param');

    await deleteTodoUseCase.execute({
      id: EntityId.create({ entityId: id }),
    });

    return c.body(null, 204);
  });
};
