import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { EntityId } from '../../../domain/todo/entity-id.vo.js';
import type { UpdateUserUseCase } from '../../../usecase/user/update-user.use-case.js';
import { UserRequestSchema } from './user.schema.js';

const route = createRoute({
  method: 'put',
  path: '/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '01J123456789ABCDEFGHJKMNPQ' }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UserRequestSchema,
        },
      },
    },
  },
  responses: {
    204: { description: 'User updated successfully' },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
    503: {
      description: 'Internal Server Error',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
  },
});

export const updateUserRoute = ({
  app,
  updateUserUseCase,
}: {
  app: OpenAPIHono;
  updateUserUseCase: UpdateUserUseCase;
}) => {
  app.openapi(route, async (c) => {
    const { id } = c.req.valid('param');
    const request = c.req.valid('json');
    await updateUserUseCase.execute({
      id: EntityId.create({ entityId: id }),
      ...request,
    });
    return c.body(null, 204);
  });
};
