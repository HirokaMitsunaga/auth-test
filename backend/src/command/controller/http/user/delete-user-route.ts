import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { EntityId } from '../../../domain/todo/entity-id.vo.js';
import type { DeleteUserUseCase } from '../../../usecase/user/delete-user.use-case.js';

const route = createRoute({
  method: 'delete',
  path: '/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '01J123456789ABCDEFGHJKMNPQ' }),
    }),
  },
  responses: {
    204: { description: 'User deleted successfully' },
    400: {
      description: 'Invalid User ID format',
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

export const deleteUserRoute = ({
  app,
  deleteUserUseCase,
}: {
  app: OpenAPIHono;
  deleteUserUseCase: DeleteUserUseCase;
}) => {
  app.openapi(route, async (c) => {
    const { id } = c.req.valid('param');

    await deleteUserUseCase.execute({
      id: EntityId.create({ entityId: id }),
    });

    return c.body(null, 204);
  });
};
