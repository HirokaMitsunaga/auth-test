import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ReadUserUseCase } from '../../../usecase/user/read-user.use-case.js';
import { UserResponseSchema } from './user.schema.js';

const route = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      description: 'Users retrieved successfully',
      content: {
        'application/json': {
          schema: z.array(UserResponseSchema),
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

export const readUserRoute = ({
  app,
  readUserUseCase,
}: {
  app: OpenAPIHono;
  readUserUseCase: ReadUserUseCase;
}) => {
  app.openapi(route, async (c) => {
    const users = await readUserUseCase.execute();

    return c.json(
      users.map((user) => ({
        id: user.getId().getEntityId(),
        name: user.getName(),
        email: user.getEmail(),
      })),
      200,
    );
  });
};
